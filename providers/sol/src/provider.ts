import type { LlmCompleteOptions, LlmProvider, LlmResult } from "@tars/contracts";

/**
 * OpenAI (Sol) adapter for the LlmProvider port.
 *
 * PORTING RECIPE (Phase 2):
 *   1. `pnpm --filter @tars/provider-sol add openai`
 *   2. new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
 *   3. In complete(): use the Responses API. When opts.schema is set, pass
 *      response_format via the SDK's zodResponseFormat(schema, name) helper for
 *      guaranteed structured output; otherwise read the text output.
 *   4. Populate LlmUsage from response.usage + an OpenAI price table.
 * The agents and prompts port from providers/claude/src/agents (tune per-model as needed).
 */
export class SolProvider implements LlmProvider {
  readonly id = "sol" as const;
  readonly defaultModel: string = process.env.SOL_MODEL ?? "gpt-5";

  async complete<T = unknown>(_opts: LlmCompleteOptions<T>): Promise<LlmResult<T>> {
    throw new Error(
      "SolProvider.complete() is a Phase-2 seam. See the porting recipe in this file and docs/PROVIDER-COMPARISON.md.",
    );
  }
}
