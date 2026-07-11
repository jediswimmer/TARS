import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { LlmCompleteOptions, LlmProvider, LlmResult, LlmUsage } from "@tars/contracts";

/** Approximate xAI pricing per 1M tokens (override as needed). Powers the bake-off cost column. */
const PRICING: Record<string, { input: number; output: number }> = {
  "grok-4": { input: 3, output: 15 },
  "grok-3": { input: 3, output: 15 },
};

function costUsd(model: string, inputTokens: number, outputTokens: number): number | undefined {
  const p = PRICING[model];
  return p ? (inputTokens * p.input + outputTokens * p.output) / 1_000_000 : undefined;
}

/**
 * xAI Grok adapter. xAI exposes an OpenAI-compatible API, so we drive it with the
 * `openai` client pointed at api.x.ai and use Chat Completions structured outputs
 * (`response_format` json_schema via `zodResponseFormat`) for typed results.
 * This is the ONLY Grok file that touches an LLM SDK — the agents are shared.
 */
export class GrokProvider implements LlmProvider {
  readonly id = "grok" as const;
  readonly defaultModel: string;
  private readonly client: OpenAI;

  constructor(opts: { apiKey?: string; model?: string; baseURL?: string } = {}) {
    this.client = new OpenAI({
      apiKey: opts.apiKey ?? process.env.XAI_API_KEY,
      baseURL: opts.baseURL ?? "https://api.x.ai/v1",
    });
    this.defaultModel = opts.model ?? process.env.GROK_MODEL ?? "grok-4";
  }

  async complete<T = unknown>(opts: LlmCompleteOptions<T>): Promise<LlmResult<T>> {
    const model = opts.model ?? this.defaultModel;
    const started = Date.now();
    const messages = [
      ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    if (opts.schema) {
      const res = await this.client.chat.completions.parse({
        model,
        max_tokens: opts.maxTokens ?? 16000,
        messages,
        response_format: zodResponseFormat(opts.schema, opts.schemaName ?? "output"),
      });
      const choice = res.choices[0];
      return {
        text: choice?.message.content ?? "",
        parsed: (choice?.message.parsed ?? undefined) as T | undefined,
        stopReason: choice?.finish_reason,
        usage: this.usage(model, res.usage, started),
      };
    }

    const res = await this.client.chat.completions.create({ model, max_tokens: opts.maxTokens ?? 16000, messages });
    const choice = res.choices[0];
    return { text: choice?.message.content ?? "", stopReason: choice?.finish_reason, usage: this.usage(model, res.usage, started) };
  }

  private usage(model: string, u: OpenAI.CompletionUsage | undefined, started: number): LlmUsage {
    const inputTokens = u?.prompt_tokens ?? 0;
    const outputTokens = u?.completion_tokens ?? 0;
    return { provider: "grok", model, inputTokens, outputTokens, costUsd: costUsd(model, inputTokens, outputTokens), latencyMs: Date.now() - started };
  }
}
