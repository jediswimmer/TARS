import type { LlmProvider, RunMode } from "@tars/contracts";
import { FileArtifactStore, createLogger, registry } from "@tars/core";
import { makeAzureConnector } from "@tars/connectors";
import { ClaudeProvider, registerClaudeFleet } from "@tars/provider-claude";
import { AZURE_SECURITY_PIPELINE } from "@tars/agents";
import { runPipeline } from "./pipeline.js";
import { ReplayProvider } from "./replay-provider.js";
import { CANNED_CLAUDE_RUN } from "./fixtures/canned-claude-run.js";

/**
 * Entry point for a pipeline run. Defaults reproduce the original offline demo
 * (Contoso fixture, replayed Claude), so `pnpm pipeline:azure` is unchanged.
 * Flags parameterize customer, connector, mode, and provider:
 *
 *   tsx run.ts azure-security \
 *     --customer=<id>            (default: contoso-financial)
 *     --connector=fixture|live   (default: fixture; live needs AZURE_* env)
 *     --mode=offline|live        (default: $TARS_MODE or offline; live LLM needs ANTHROPIC_API_KEY)
 *     --provider=claude          (only claude is wired here; use the bake-off for grok/sol)
 */

interface Flags {
  pipeline: string;
  customer: string;
  connector: "fixture" | "live";
  mode: RunMode;
  provider: string;
}

function parseFlags(argv: string[]): Flags {
  const positional: string[] = [];
  const opts = new Map<string, string>();
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const body = arg.slice(2);
      const eq = body.indexOf("=");
      const key = eq === -1 ? body : body.slice(0, eq);
      const value = eq === -1 ? "true" : body.slice(eq + 1);
      opts.set(key, value);
    } else {
      positional.push(arg);
    }
  }
  const connector = (opts.get("connector") ?? "fixture") as Flags["connector"];
  if (connector !== "fixture" && connector !== "live") {
    throw new Error(`--connector must be 'fixture' or 'live', got '${connector}'`);
  }
  const mode = (opts.get("mode") ?? (process.env.TARS_MODE as RunMode) ?? "offline") as RunMode;
  if (mode !== "offline" && mode !== "live") {
    throw new Error(`--mode must be 'offline' or 'live', got '${mode}'`);
  }
  return {
    pipeline: positional[0] ?? "azure-security",
    customer: opts.get("customer") ?? "contoso-financial",
    connector,
    mode,
    provider: opts.get("provider") ?? "claude",
  };
}

/** Read least-privilege live-connector credentials from the AZURE_* env. */
function azureCreds() {
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID } = process.env;
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_SUBSCRIPTION_ID) {
    throw new Error(
      "--connector=live requires AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET and AZURE_SUBSCRIPTION_ID.",
    );
  }
  return {
    tenantId: AZURE_TENANT_ID,
    clientId: AZURE_CLIENT_ID,
    clientSecret: AZURE_CLIENT_SECRET,
    subscriptionId: AZURE_SUBSCRIPTION_ID,
  };
}

/** Human-friendly customer name; keeps the demo's "Contoso Financial" label. */
function customerName(id: string): string {
  return id === "contoso-financial" ? "Contoso Financial" : id;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  // The pipeline registry that lifts this restriction is S2 (docs/plans/030).
  if (flags.pipeline !== "azure-security") throw new Error(`Unknown pipeline "${flags.pipeline}"`);
  if (flags.provider !== "claude") {
    throw new Error(`Provider "${flags.provider}" is not wired in run.ts; use the bake-off for grok/sol.`);
  }

  const logger = createLogger("run");
  const store = new FileArtifactStore(process.env.TARS_RUN_DIR ?? "./runs");

  registerClaudeFleet(registry);

  const connector =
    flags.connector === "live" ? makeAzureConnector("live", azureCreds()) : makeAzureConnector("offline");
  const snapshot = await connector.capture({});
  const llm: LlmProvider =
    flags.mode === "live" ? new ClaudeProvider() : new ReplayProvider(CANNED_CLAUDE_RUN, "claude");

  logger.info(`Running Azure security pipeline`, {
    mode: flags.mode,
    connector: flags.connector,
    customer: flags.customer,
    provider: flags.provider,
  });

  const result = await runPipeline(AZURE_SECURITY_PIPELINE, {
    provider: "claude",
    customerId: flags.customer,
    mode: flags.mode,
    llm,
    store,
    registry,
    config: {
      snapshot,
      customer: { id: flags.customer, name: customerName(flags.customer) },
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
