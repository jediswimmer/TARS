import { z } from "zod";
import type { ZodType } from "zod";
import { ProviderId } from "./provider.js";

/**
 * ARTIFACTS ARE THE HANDOFF CURRENCY. Every agent consumes zero or more
 * artifacts and produces exactly one. The pipeline is just a DAG of agents
 * wired together by artifact `kind`. Because the envelope is identical no
 * matter which LLM produced the body, we can diff Claude-vs-Grok-vs-Sol output
 * artifact-for-artifact.
 */
export const ArtifactKind = z.enum([
  "scan_findings",
  "reviewed_findings",
  "security_report",
  "executive_view",
  "technical_view",
  "notifications",
]);
export type ArtifactKind = z.infer<typeof ArtifactKind>;

/** Provenance stamped on every artifact — critical for the bake-off + audit trail. */
export const Provenance = z.object({
  agentId: z.string(),
  provider: ProviderId,
  model: z.string().optional(),
});
export type Provenance = z.infer<typeof Provenance>;

/** The generic envelope. `body` is refined per-kind by the factory below. */
export const ArtifactEnvelope = z.object({
  id: z.string(),
  kind: ArtifactKind,
  schemaVersion: z.string().default("0.1.0"),
  customerId: z.string(),
  runId: z.string(),
  producedBy: Provenance,
  createdAt: z.iso.datetime(),
  /** Artifact ids this one was derived from (its inputs). Builds the lineage graph. */
  inputs: z.array(z.string()).default([]),
});

/**
 * Build a fully-typed artifact schema for a given kind + body schema.
 * Usage: `export const ScanFindings = artifact("scan_findings", ScanFindingsBody)`.
 */
export function artifact<K extends ArtifactKind, B extends ZodType>(kind: K, body: B) {
  return ArtifactEnvelope.extend({
    kind: z.literal(kind),
    body,
  });
}

export type Artifact<K extends ArtifactKind = ArtifactKind, B = unknown> = z.infer<
  typeof ArtifactEnvelope
> & { kind: K; body: B };

/**
 * PORT: where artifacts live between handoffs. The MVP implements this over the
 * local filesystem (runs/<runId>/…); production swaps in Postgres/Blob without
 * touching a single agent.
 */
export interface ArtifactStore {
  put(artifact: Artifact): Promise<void>;
  get(id: string): Promise<Artifact | null>;
  /** Most recent artifact of a kind for a customer — how an agent finds its input. */
  latest(kind: ArtifactKind, customerId: string): Promise<Artifact | null>;
  list(filter: { customerId?: string; kind?: ArtifactKind; runId?: string }): Promise<Artifact[]>;
}
