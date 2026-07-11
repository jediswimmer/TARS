import { z } from "zod";
import type { Artifact, ArtifactKind, ArtifactStore } from "./artifact.js";
import type { LlmProvider, ProviderId } from "./provider.js";

/**
 * Declarative metadata for an agent. The orchestrator reads `consumes`/`produces`
 * to wire the DAG and `schedule` to register the cron trigger. Every agent in
 * the fleet — Azure scanner, reviewer, report author, the two POV agents, the
 * customer-service and notification agents — is described by one of these.
 */
export const AgentDefinition = z.object({
  id: z.string().describe("stable slug, e.g. 'azure-security-scanner'"),
  name: z.string(),
  description: z.string(),
  version: z.string().default("0.1.0"),
  provider: z.custom<ProviderId>(),
  /** Artifact kinds this agent reads. Empty = a source agent (e.g. the scanner). */
  consumes: z.array(z.custom<ArtifactKind>()).default([]),
  /** The single artifact kind this agent emits. */
  produces: z.custom<ArtifactKind>(),
  /** Cron expression for scheduled runs. Omitted = run on-demand / via handoff only. */
  schedule: z.string().optional(),
  /** Model override; falls back to the provider default. */
  model: z.string().optional(),
});
export type AgentDefinition = z.infer<typeof AgentDefinition>;

export type RunMode = "offline" | "live";

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

/** Everything an agent needs to do its job — injected by the orchestrator. */
export interface AgentContext {
  runId: string;
  customerId: string;
  mode: RunMode;
  /** Resolved artifacts matching this agent's `consumes`, in declaration order. */
  inputs: Artifact[];
  llm: LlmProvider;
  store: ArtifactStore;
  logger: Logger;
  /** Free-form per-run config (scope, thresholds, feature flags). */
  config: Record<string, unknown>;
}

export interface AgentResult<T = unknown> {
  artifact: Artifact<ArtifactKind, T>;
  /** Aggregated token usage for this agent's run — feeds the cost + latency comparison. */
  usage?: { inputTokens: number; outputTokens: number; costUsd?: number; latencyMs?: number };
}

/**
 * The behavioral contract. A provider folder implements one class per fleet role
 * (they share prompts via the provider's own module), each exposing `definition`
 * + `run`. The orchestrator only ever sees this interface.
 */
export interface Agent<T = unknown> {
  readonly definition: AgentDefinition;
  run(ctx: AgentContext): Promise<AgentResult<T>>;
}
