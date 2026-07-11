import type { LlmCompleteOptions, LlmProvider, LlmResult } from "@tars/contracts";

/**
 * xAI Grok adapter for the LlmProvider port.
 *
 * PORTING RECIPE (Phase 2):
 *   1. `pnpm --filter @tars/provider-grok add openai`
 *   2. Construct an OpenAI-compatible client pointed at xAI:
 *        new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: "https://api.x.ai/v1" })
 *   3. In complete(): map opts.messages → chat.completions messages; when opts.schema
 *      is set, use response_format: { type: "json_schema", json_schema: zodToJsonSchema(schema) }
 *      (Grok supports structured outputs) and JSON.parse the result into `parsed`.
 *   4. Populate LlmUsage from the response's usage block + a Grok price table.
 * The agents and prompts port from providers/claude/src/agents (tune per-model as needed).
 */
export class GrokProvider implements LlmProvider {
  readonly id = "grok" as const;
  readonly defaultModel: string = process.env.GROK_MODEL ?? "grok-4";

  async complete<T = unknown>(_opts: LlmCompleteOptions<T>): Promise<LlmResult<T>> {
    throw new Error(
      "GrokProvider.complete() is a Phase-2 seam. See the porting recipe in this file and docs/PROVIDER-COMPARISON.md.",
    );
  }
}
