import type { LlmProvider, RunMode } from "@tars/contracts";
import { FileArtifactStore, createLogger, registry } from "@tars/core";
import { FixtureAzureConnector } from "@tars/connectors";
import { ClaudeProvider, registerClaudeFleet } from "@tars/provider-claude";
import { runPipeline } from "./pipeline.js";
import { AZURE_SECURITY_PIPELINE } from "./pipelines/azure-security.js";
import { ReplayProvider } from "./replay-provider.js";
import { CANNED_CLAUDE_RUN } from "./fixtures/canned-claude-run.js";

/**
 * Entry point for a pipeline run.
 *   TARS_MODE=offline (default) → replay provider, no credentials needed.
 *   TARS_MODE=live               → real ClaudeProvider (needs ANTHROPIC_API_KEY).
 * The Azure snapshot comes from the fixture connector today; swap in
 * LiveAzureConnector (Phase 2) to scan a real tenant.
 */
async function main(): Promise<void> {
  const pipelineName = process.argv[2] ?? "azure-security";
  if (pipelineName !== "azure-security") throw new Error(`Unknown pipeline "${pipelineName}"`);

  const mode = (process.env.TARS_MODE as RunMode) ?? "offline";
  const logger = createLogger("run");
  const store = new FileArtifactStore(process.env.TARS_RUN_DIR ?? "./runs");
  const customerId = "contoso-financial";

  registerClaudeFleet(registry);

  const snapshot = await new FixtureAzureConnector().capture();
  const llm: LlmProvider = mode === "live" ? new ClaudeProvider() : new ReplayProvider(CANNED_CLAUDE_RUN, "claude");

  logger.info(`Running Azure security pipeline`, { mode, customer: customerId, provider: "claude" });

  const result = await runPipeline(AZURE_SECURITY_PIPELINE, {
    provider: "claude",
    customerId,
    mode,
    llm,
    store,
    registry,
    config: {
      snapshot,
      customer: { id: customerId, name: "Contoso Financial" },
      period: { from: snapshot.capturedAt, to: snapshot.capturedAt },
    },
  });

  logger.info(`Done`, { runId: result.runId, artifacts: result.steps.length });
  for (const s of result.steps) logger.info(`  ${s.agentId} → ${s.kind} (${s.artifactId})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
