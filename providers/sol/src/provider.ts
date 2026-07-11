import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { LlmCompleteOptions, LlmProvider, LlmResult, LlmUsage } from "@tars/contracts";

/** Approximate OpenAI pricing per 1M tokens (override as needed). Powers the bake-off cost column. */
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5": { input: 5, output: 15 },
  "gpt-5-mini": { input: 1, output: 4 },
};

function costUsd(model: string, inputTokens: number, outputTokens: number): number | undefined {
  const p = PRICING[model];
  return p ? (inputTokens * p.input + outputTokens * p.output) / 1_000_000 : undefined;
}

/**
 * OpenAI (Sol) adapter, on the current Responses API. Structured output uses
 * `responses.parse` + `zodTextFormat` for guaranteed schema-conforming, typed
 * results. The ONLY Sol file that touches an LLM SDK — the agents are shared.
 */
export class SolProvider implements LlmProvider {
  readonly id = "sol" as const;
  readonly defaultModel: string;
  private readonly client: OpenAI;

  constructor(opts: { apiKey?: string; model?: string } = {}) {
    this.client = new OpenAI({ apiKey: opts.apiKey ?? process.env.OPENAI_API_KEY });
    this.defaultModel = opts.model ?? process.env.SOL_MODEL ?? "gpt-5";
  }

  async complete<T = unknown>(opts: LlmCompleteOptions<T>): Promise<LlmResult<T>> {
    const model = opts.model ?? this.defaultModel;
    const started = Date.now();
    const input = opts.messages.map((m) => ({ role: m.role, content: m.content }));

    if (opts.schema) {
      const res = await this.client.responses.parse({
        model,
        ...(opts.system ? { instructions: opts.system } : {}),
        input,
        max_output_tokens: opts.maxTokens ?? 16000,
        text: { format: zodTextFormat(opts.schema, opts.schemaName ?? "output") },
      });
      return {
        text: res.output_text ?? "",
        parsed: (res.output_parsed ?? undefined) as T | undefined,
        stopReason: res.status ?? undefined,
        usage: this.usage(model, res.usage, started),
      };
    }

    const res = await this.client.responses.create({
      model,
      ...(opts.system ? { instructions: opts.system } : {}),
      input,
      max_output_tokens: opts.maxTokens ?? 16000,
    });
    return { text: res.output_text ?? "", stopReason: res.status ?? undefined, usage: this.usage(model, res.usage, started) };
  }

  private usage(model: string, u: { input_tokens?: number; output_tokens?: number } | null | undefined, started: number): LlmUsage {
    const inputTokens = u?.input_tokens ?? 0;
    const outputTokens = u?.output_tokens ?? 0;
    return { provider: "sol", model, inputTokens, outputTokens, costUsd: costUsd(model, inputTokens, outputTokens), latencyMs: Date.now() - started };
  }
}
