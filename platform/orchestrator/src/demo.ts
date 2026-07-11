import type { NotificationsBody, ReviewedFindingsBody, ScanFindingsBody } from "@tars/contracts";
import { FileArtifactStore, registry } from "@tars/core";
import { FixtureAzureConnector } from "@tars/connectors";
import { registerClaudeFleet } from "@tars/provider-claude";
import { runPipeline } from "./pipeline.js";
import { AZURE_SECURITY_PIPELINE } from "./pipelines/azure-security.js";
import { ReplayProvider } from "./replay-provider.js";
import { CANNED_CLAUDE_RUN } from "./fixtures/canned-claude-run.js";

/**
 * `pnpm demo` — runs the whole Azure security fleet OFFLINE (no API key) against
 * the Contoso Financial fixture tenant, then prints what each stage produced.
 * This is the fastest way to see the cascading-handoff architecture work.
 */
async function main(): Promise<void> {
  const runDir = process.env.TARS_RUN_DIR ?? "./runs";
  const store = new FileArtifactStore(runDir);
  const customerId = "contoso-financial";

  registerClaudeFleet(registry);
  const snapshot = await new FixtureAzureConnector().capture();

  console.log("\n🛰  TARS — Azure Security Pipeline (offline demo)\n");
  console.log(`   Tenant: Contoso Financial · ${snapshot.resources.length} resources · ${snapshot.identities.length} identities\n`);

  const result = await runPipeline(AZURE_SECURITY_PIPELINE, {
    provider: "claude",
    customerId,
    mode: "offline",
    llm: new ReplayProvider(CANNED_CLAUDE_RUN, "claude"),
    store,
    registry,
    config: {
      snapshot,
      customer: { id: customerId, name: "Contoso Financial" },
      period: { from: snapshot.capturedAt, to: snapshot.capturedAt },
    },
  });

  const scan = (await store.get(result.steps[0]!.artifactId))?.body as ScanFindingsBody;
  const reviewed = (await store.get(result.steps[1]!.artifactId))?.body as ReviewedFindingsBody;
  const notifs = (await store.get(result.steps.at(-1)!.artifactId))?.body as NotificationsBody;

  console.log("   Pipeline stages:");
  for (const s of result.steps) console.log(`     ✔ ${s.agentId.padEnd(24)} → ${s.kind}`);

  console.log(`\n   Scan: ${scan.summary.total} findings ` + `(critical ${scan.summary.bySeverity.critical}, high ${scan.summary.bySeverity.high})`);
  console.log(`   Review: overall risk ${reviewed.overallRiskScore}/100 — ${reviewed.postureSummary}`);

  console.log(`\n   📊 Dashboard notifications (${notifs.items.length}):`);
  for (const n of notifs.items) console.log(`     [${n.priority}] ${n.severity.toUpperCase()}  ${n.title}`);

  console.log(`\n   Artifacts written under: ${runDir}/artifacts/  (run id ${result.runId})\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
