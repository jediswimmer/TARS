import type { LlmCompleteOptions, LlmProvider, LlmResult, ProviderId } from "@tars/contracts";

/**
 * Offline LLM: returns pre-baked responses keyed by `schemaName` instead of
 * calling a real model. This lets the ENTIRE pipeline run end-to-end with zero
 * credentials (CI, demos, wiring tests). Live runs swap in a real provider —
 * the agents can't tell the difference, which is exactly the seam we want.
 *
 * Note: in replay mode cross-artifact ids are illustrative (the canned reviewer
 * doesn't know the scanner's runtime ids). Live mode produces truly linked ids.
 */
export class ReplayProvider implements LlmProvider {
  readonly id: ProviderId;
  readonly defaultModel = "replay";

  constructor(
    private readonly canned: Record<string, unknown>,
    id: ProviderId = "claude",
  ) {
    this.id = id;
  }

  async complete<T = unknown>(opts: LlmCompleteOptions<T>): Promise<LlmResult<T>> {
    const key = opts.schemaName ?? "";
    if (!(key in this.canned)) {
      throw new Error(`ReplayProvider has no canned response for schemaName "${key}". Add one to the fixture.`);
    }
    const parsed = this.canned[key] as T;
    return {
      text: typeof parsed === "string" ? parsed : JSON.stringify(parsed),
      parsed,
      stopReason: "end_turn",
      usage: { provider: this.id, model: "replay", inputTokens: 0, outputTokens: 0, costUsd: 0, latencyMs: 0 },
    };
  }
}
