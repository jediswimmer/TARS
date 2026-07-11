import type { LlmProvider, LlmUsage, ProviderId, ReviewedFindingsBody, RunMode, ScanFindingsBody } from "@tars/contracts";
import { FileArtifactStore, registry } from "@tars/core";
import { AZURE_SECURITY_PIPELINE } from "@tars/agents";
import { FixtureAzureConnector } from "@tars/connectors";
import { ClaudeProvider, registerClaudeFleet } from "@tars/provider-claude";
import { GrokProvider, registerGrokFleet } from "@tars/provider-grok";
import { SolProvider, registerSolFleet } from "@tars/provider-sol";
import { compareRuns, type Baseline, type ProviderRun } from "@tars/evals";
import { runPipeline } from "./pipeline.js";
import { ReplayProvider } from "./replay-provider.js";
import { CANNED_CLAUDE_RUN } from "./fixtures/canned-claude-run.js";

/** Known findings for the fixture tenant — the ground truth coverage is scored against. */
const BASELINE: Baseline = {
  findings: [
    { title: "RDP (3389) exposed to the internet", severity: "critical" },
    { title: "Global Administrator account has no MFA", severity: "critical" },
    { title: "Storage account allows public blob access", severity: "high" },
  ],
};

function providerLlm(provider: ProviderId, mode: RunMode): LlmProvider {
  if (mode === "offline") return new ReplayProvider(CANNED_CLAUDE_RUN, provider);
  switch (provider) {
    case "claude": return new ClaudeProvider();
    case "grok": return new GrokProvider();
    case "sol": return new SolProvider();
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
    config: { snapshot, customer: { id: customerId, name: "Contoso Financial" }, period: { from: snapshot.capturedAt, to: snapshot.capturedAt } },
  });

  const scanId = result.steps.find((s) => s.kind === "scan_findings")!.artifactId;
  const reviewedId = result.steps.find((s) => s.kind === "reviewed_findings")!.artifactId;
  const scan = (await store.get(scanId))!.body as ScanFindingsBody;
  const reviewed = (await store.get(reviewedId))!.body as ReviewedFindingsBody;
  const usage: LlmUsage[] = result.steps
    .filter((s) => s.usage)
    .map((s) => ({ provider, model: "", inputTokens: s.usage!.inputTokens, outputTokens: s.usage!.outputTokens, costUsd: s.usage!.costUsd, latencyMs: s.usage!.latencyMs }));

  return { provider, scan, reviewed, usage };
}

async function main(): Promise<void> {
  const mode = (process.env.TARS_MODE as RunMode) ?? "offline";
  // Which providers to enter: default all three; live mode needs each provider's API key.
  const providers = (process.env.BAKEOFF_PROVIDERS?.split(",") as ProviderId[] | undefined) ?? ["claude", "grok", "sol"];

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

  const scored = compareRuns(runs, { baseline: BASELINE });
  console.log(`\n   Ranking (composite 0–1):`);
  console.log(`   ${"provider".padEnd(10)} ${"score".padEnd(7)} ${"findings".padEnd(9)} ${"FP-rate".padEnd(8)} ${"cost$".padEnd(9)} latency`);
  for (const s of scored) {
    console.log(
      `   ${s.provider.padEnd(10)} ${s.composite.toFixed(3).padEnd(7)} ${String(s.metrics.findingsTotal).padEnd(9)} ${(s.metrics.falsePositiveRate * 100).toFixed(0).padEnd(7)}% ${s.metrics.totalCostUsd.toFixed(4).padEnd(9)} ${s.metrics.totalLatencyMs}ms`,
    );
  }
  console.log(`\n   Winner: ${scored[0]?.provider ?? "—"}${mode === "offline" ? "  (offline replay — identical inputs, so scores tie; run live for real differences)" : ""}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
