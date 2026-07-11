import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  LlmProvider,
  LlmUsage,
  ProviderId,
  ReviewedFindingsBody,
  RunMode,
  ScanFindingsBody,
  SecurityReportBody,
} from "@tars/contracts";
import { FileArtifactStore, registry } from "@tars/core";
import { AZURE_SECURITY_PIPELINE } from "@tars/agents";
import { FixtureAzureConnector } from "@tars/connectors";
import { ClaudeProvider, registerClaudeFleet } from "@tars/provider-claude";
import { GrokProvider, registerGrokFleet } from "@tars/provider-grok";
import { SolProvider, registerSolFleet } from "@tars/provider-sol";
import {
  compareRuns,
  CONTOSO_GOLDEN,
  judgeReportQuality,
  neutralJudgeScores,
  RUBRIC,
  type ProviderRun,
  type RunScore,
} from "@tars/evals";
import { runPipeline } from "./pipeline.js";
import { ReplayProvider } from "./replay-provider.js";
import { CANNED_CLAUDE_RUN } from "./fixtures/canned-claude-run.js";

function providerLlm(provider: ProviderId, mode: RunMode): LlmProvider {
  if (mode === "offline") return new ReplayProvider(CANNED_CLAUDE_RUN, provider);
  switch (provider) {
    case "claude":
      return new ClaudeProvider();
    case "grok":
      return new GrokProvider();
    case "sol":
      return new SolProvider();
  }
}

async function runFor(provider: ProviderId, mode: RunMode): Promise<ProviderRun> {
  const store = new FileArtifactStore(process.env.TARS_RUN_DIR ?? "./runs");
  const snapshot = await new FixtureAzureConnector().capture();
  const customerId = `contoso-financial-${provider}`; // isolate each provider's artifacts

  const result = await runPipeline(AZURE_SECURITY_PIPELINE, {
    provider,
    customerId,
    mode,
    llm: providerLlm(provider, mode),
    store,
    registry,
    config: {
      snapshot,
      customer: { id: customerId, name: "Contoso Financial" },
      period: { from: snapshot.capturedAt, to: snapshot.capturedAt },
    },
  });

  const scanId = result.steps.find((s) => s.kind === "scan_findings")!.artifactId;
  const reviewedId = result.steps.find((s) => s.kind === "reviewed_findings")!.artifactId;
  const reportId = result.steps.find((s) => s.kind === "security_report")!.artifactId;
  const scan = (await store.get(scanId))!.body as ScanFindingsBody;
  const reviewed = (await store.get(reviewedId))!.body as ReviewedFindingsBody;
  const report = (await store.get(reportId))!.body as SecurityReportBody;
  const usage: LlmUsage[] = result.steps
    .filter((s) => s.usage)
    .map((s) => ({
      provider,
      model: "",
      inputTokens: s.usage!.inputTokens,
      outputTokens: s.usage!.outputTokens,
      costUsd: s.usage!.costUsd,
      latencyMs: s.usage!.latencyMs,
    }));

  return { provider, scan, reviewed, report, usage };
}

function formatReportMd(opts: {
  mode: RunMode;
  providers: ProviderId[];
  scored: RunScore[];
  judgeModel: string | null;
  timestamp: string;
}): string {
  const { mode, providers, scored, judgeModel, timestamp } = opts;
  const lines: string[] = [
    `# TARS Provider Bake-Off`,
    ``,
    `- **When:** ${timestamp}`,
    `- **Mode:** ${mode}`,
    `- **Providers:** ${providers.join(", ")}`,
    `- **Input:** Contoso Financial fixture (identical snapshot for all providers)`,
    `- **Judge:** ${judgeModel ? `${judgeModel} (blinded reportQuality)` : "neutral 0.5 (offline / no live judge)"}`,
    ``,
    `## Ranking`,
    ``,
    `| Rank | Provider | Composite | Coverage | FP (inv) | Severity | Report | Cost | Latency |`,
    `| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`,
  ];

  scored.forEach((s, i) => {
    const d = s.dimensions;
    lines.push(
      `| ${i + 1} | ${s.provider} | ${s.composite.toFixed(3)} | ${(d.coverage ?? 0).toFixed(2)} | ${(d.falsePositiveRate ?? 0).toFixed(2)} | ${(d.severityAccuracy ?? 0).toFixed(2)} | ${(d.reportQuality ?? 0).toFixed(2)} | ${(d.cost ?? 0).toFixed(2)} | ${(d.latency ?? 0).toFixed(2)} |`,
    );
  });

  lines.push(``, `## Per-dimension weights`, ``);
  for (const d of RUBRIC) {
    lines.push(`- **${d.label}** (\`${d.key}\`): weight ${d.weight}, source ${d.source}`);
  }

  lines.push(
    ``,
    `## Metrics`,
    ``,
    `| Provider | Findings | FP rate | Cost USD | Latency ms | Tokens |`,
    `| --- | ---: | ---: | ---: | ---: | ---: |`,
  );
  for (const s of scored) {
    const m = s.metrics;
    lines.push(
      `| ${s.provider} | ${m.findingsTotal} | ${(m.falsePositiveRate * 100).toFixed(0)}% | ${m.totalCostUsd.toFixed(4)} | ${m.totalLatencyMs} | ${m.totalTokens} |`,
    );
  }

  lines.push(
    ``,
    `## Caveats`,
    ``,
    `- Same fixture snapshot for every provider — differences are attributable to the model (and prompts), not the Azure input.`,
    `- \`severityAccuracy\` scores per baseline finding: 1.0 match+severity, 0.5 match wrong severity, 0.0 miss.`,
    mode === "offline"
      ? `- Offline mode uses a canned replay LLM; provider runs are intentionally near-identical and often tie.`
      : `- Live mode calls real provider APIs; cost and latency reflect that run only.`,
    judgeModel && providers.includes("claude")
      ? `- Judge model is Claude. When Claude is also under test, treat \`reportQuality\` as a known fairness caveat (labels are blinded, but the judge family matches one contestant).`
      : `- Report quality used neutral scores or a non-contestant judge.`,
    ``,
    `**Winner:** ${scored[0]?.provider ?? "—"}`,
    ``,
  );

  return lines.join("\n");
}

async function resolveJudgeScores(
  mode: RunMode,
  runs: ProviderRun[],
): Promise<{ scores: Record<ProviderId, number>; judgeModel: string | null }> {
  const providers = runs.map((r) => r.provider);
  if (mode !== "live") {
    return { scores: neutralJudgeScores(providers), judgeModel: null };
  }

  const withReports = runs.filter((r): r is ProviderRun & { report: SecurityReportBody } => !!r.report);
  if (withReports.length === 0) {
    return { scores: neutralJudgeScores(providers), judgeModel: null };
  }

  const judge = new ClaudeProvider();
  const scores = await judgeReportQuality(withReports, async (system, user) => {
    const res = await judge.complete({
      system,
      messages: [{ role: "user", content: user }],
      maxTokens: 2048,
    });
    return res.text;
  });
  return { scores, judgeModel: judge.defaultModel };
}

async function main(): Promise<void> {
  const mode = (process.env.TARS_MODE as RunMode) ?? "offline";
  const providers =
    (process.env.BAKEOFF_PROVIDERS?.split(",").map((s) => s.trim()).filter(Boolean) as
      | ProviderId[]
      | undefined) ?? ["claude", "grok", "sol"];

  registerClaudeFleet(registry);
  registerGrokFleet(registry);
  registerSolFleet(registry);

  console.log(`\n🏁  TARS provider bake-off — mode=${mode}, providers=${providers.join(", ")}\n`);
  const runs: ProviderRun[] = [];
  for (const p of providers) {
    try {
      runs.push(await runFor(p, mode));
      console.log(`   ✔ ${p} completed`);
    } catch (err) {
      console.log(`   ✖ ${p} failed: ${(err as Error).message}`);
    }
  }

  if (runs.length === 0) {
    console.error("\n   No provider runs succeeded.\n");
    process.exit(1);
  }

  const { scores: judgeScores, judgeModel } = await resolveJudgeScores(mode, runs);
  const scored = compareRuns(runs, { baseline: CONTOSO_GOLDEN, judgeScores });

  console.log(`\n   Ranking (composite 0–1):`);
  console.log(
    `   ${"provider".padEnd(10)} ${"score".padEnd(7)} ${"findings".padEnd(9)} ${"FP-rate".padEnd(8)} ${"cost$".padEnd(9)} latency`,
  );
  for (const s of scored) {
    console.log(
      `   ${s.provider.padEnd(10)} ${s.composite.toFixed(3).padEnd(7)} ${String(s.metrics.findingsTotal).padEnd(9)} ${(s.metrics.falsePositiveRate * 100).toFixed(0).padEnd(7)}% ${s.metrics.totalCostUsd.toFixed(4).padEnd(9)} ${s.metrics.totalLatencyMs}ms`,
    );
  }
  console.log(
    `\n   Winner: ${scored[0]?.provider ?? "—"}${mode === "offline" ? "  (offline replay — identical inputs, so scores tie; run live for real differences)" : ""}\n`,
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(process.env.TARS_RUN_DIR ?? "./runs", "bakeoff");
  await mkdir(outDir, { recursive: true });
  const rankingPath = join(outDir, `${timestamp}-ranking.json`);
  const reportPath = join(outDir, `${timestamp}-report.md`);

  await writeFile(
    rankingPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        mode,
        providers,
        judgeModel,
        baseline: CONTOSO_GOLDEN,
        scores: scored,
      },
      null,
      2,
    ),
  );
  await writeFile(
    reportPath,
    formatReportMd({
      mode,
      providers,
      scored,
      judgeModel,
      timestamp: new Date().toISOString(),
    }),
  );

  console.log(`   Wrote ${rankingPath}`);
  console.log(`   Wrote ${reportPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
