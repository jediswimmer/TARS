import type {
  Agent,
  AgentContext,
  AgentDefinition,
  AgentResult,
  Artifact,
  ArtifactKind,
} from "@tars/contracts";
import { newId, nowIso } from "./ids.js";

/**
 * BaseAgent removes the boilerplate every fleet role would otherwise repeat:
 * wrapping a body into a provenance-stamped artifact envelope. Subclasses supply
 * a `definition` and implement `produce()` — returning just the body + usage.
 *
 * Providers (claude/grok/sol) subclass this; the ONLY thing that differs between
 * providers is the prompt + the injected `ctx.llm`. That is the whole trick.
 */
export abstract class BaseAgent<TBody = unknown> implements Agent<TBody> {
  abstract readonly definition: AgentDefinition;

  /** Do the work: read `ctx.inputs`, call `ctx.llm`, return the artifact body. */
  protected abstract produce(ctx: AgentContext): Promise<{ body: TBody; usage?: AgentResult["usage"] }>;

  async run(ctx: AgentContext): Promise<AgentResult<TBody>> {
    ctx.logger.info(`▶ ${this.definition.id} starting`, { runId: ctx.runId, mode: ctx.mode });
    const { body, usage } = await this.produce(ctx);
    const artifact = this.wrap(ctx, body);
    await ctx.store.put(artifact);
    ctx.logger.info(`✔ ${this.definition.id} produced ${artifact.kind}`, {
      artifactId: artifact.id,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
    });
    return { artifact, usage };
  }

  /** Wrap a body into the standard envelope, stamping provenance + lineage. */
  protected wrap(ctx: AgentContext, body: TBody): Artifact<ArtifactKind, TBody> {
    return {
      id: newId(this.definition.produces),
      kind: this.definition.produces,
      schemaVersion: "0.1.0",
      customerId: ctx.customerId,
      runId: ctx.runId,
      producedBy: {
        agentId: this.definition.id,
        provider: this.definition.provider,
        model: this.definition.model ?? ctx.llm.defaultModel,
      },
      createdAt: nowIso(),
      inputs: ctx.inputs.map((a) => a.id),
      body,
    };
  }
}
