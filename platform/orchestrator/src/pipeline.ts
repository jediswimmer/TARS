import type {
  AgentContext,
  Artifact,
  ArtifactKind,
  ArtifactStore,
  LlmProvider,
  Logger,
  ProviderId,
  RunMode,
} from "@tars/contracts";
import { type AgentRegistry, createLogger, newRunId } from "@tars/core";

export interface PipelineOptions {
  provider: ProviderId;
  customerId: string;
  mode: RunMode;
  llm: LlmProvider;
  store: ArtifactStore;
  registry: AgentRegistry;
  /** Per-run config passed to every agent (snapshot, customer, period, thresholds…). */
  config?: Record<string, unknown>;
  logger?: Logger;
}

export interface StepResult {
  agentId: string;
  artifactId: string;
  kind: ArtifactKind;
  usage?: { inputTokens: number; outputTokens: number; costUsd?: number; latencyMs?: number };
}

export interface PipelineResult {
  runId: string;
  provider: ProviderId;
  customerId: string;
  steps: StepResult[];
}

/**
 * Run an ordered list of agents. The DAG is implicit: each agent declares the
 * artifact kinds it `consumes`, and the runner resolves those from the store
 * (newest wins — i.e. the artifact the previous stage just produced). Swap
 * `provider` and the exact same steps run on a different LLM — that is the
 * whole point of the bake-off.
 */
export async function runPipeline(agentIds: string[], opts: PipelineOptions): Promise<PipelineResult> {
  const runId = newRunId();
  const logger = opts.logger ?? createLogger(`pipeline:${opts.provider}`);
  const steps: StepResult[] = [];

  logger.info(`Pipeline start`, { runId, provider: opts.provider, customer: opts.customerId, stages: agentIds.length });

  for (const agentId of agentIds) {
    const agent = opts.registry.get(opts.provider, agentId);

    // Resolve inputs by the kinds this agent consumes (dedupe, newest per kind).
    const inputs: Artifact[] = [];
    for (const kind of new Set(agent.definition.consumes)) {
      const found = await opts.store.latest(kind, opts.customerId);
      if (found) inputs.push(found);
    }

    const ctx: AgentContext = {
      runId,
      customerId: opts.customerId,
      mode: opts.mode,
      inputs,
      llm: opts.llm,
      store: opts.store,
      logger,
      config: opts.config ?? {},
    };

    const { artifact, usage } = await agent.run(ctx);
    steps.push({ agentId, artifactId: artifact.id, kind: artifact.kind, usage });
  }

  logger.info(`Pipeline complete`, { runId, steps: steps.length });
  return { runId, provider: opts.provider, customerId: opts.customerId, steps };
}
