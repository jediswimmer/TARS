import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { LlmCompleteOptions, LlmProvider, LlmResult, LlmUsage } from "@tars/contracts";

/** Per-1M-token pricing so the bake-off can report a real cost column. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

function costUsd(model: string, inputTokens: number, outputTokens: number): number | undefined {
  const p = PRICING[model];
  return p ? (inputTokens * p.input + outputTokens * p.output) / 1_000_000 : undefined;
}

/**
 * The Anthropic adapter for the LlmProvider port. The ONLY file in the Claude
 * fleet that touches `@anthropic-ai/sdk`. Structured output uses the SDK's
 * `messages.parse` + `zodOutputFormat` (guaranteed schema-conforming JSON,
 * validated and typed). Adaptive thinking + high effort suit security analysis.
 */
export class ClaudeProvider implements LlmProvider {
  readonly id = "claude" as const;
  readonly defaultModel: string;
  private readonly client: Anthropic;

  constructor(opts: { apiKey?: string; model?: string } = {}) {
    this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
    this.defaultModel = opts.model ?? process.env.CLAUDE_MODEL ?? "claude-opus-4-8";
  }

  async complete<T = unknown>(opts: LlmCompleteOptions<T>): Promise<LlmResult<T>> {
    const model = opts.model ?? this.defaultModel;
    const started = Date.now();

    if (opts.schema) {
      const res = await this.client.messages.parse({
        model,
        max_tokens: opts.maxTokens ?? 16000,
        ...(opts.system ? { system: opts.system } : {}),
        thinking: { type: "adaptive" },
        output_config: { format: zodOutputFormat(opts.schema), effort: "high" },
        messages: opts.messages,
      });
      return {
        text: this.textOf(res.content),
        parsed: (res.parsed_output ?? undefined) as T | undefined,
        stopReason: res.stop_reason ?? undefined,
        usage: this.usage(model, res.usage, started),
      };
    }

    const res = await this.client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 16000,
      ...(opts.system ? { system: opts.system } : {}),
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      messages: opts.messages,
    });
    return { text: this.textOf(res.content), stopReason: res.stop_reason ?? undefined, usage: this.usage(model, res.usage, started) };
  }

  private textOf(content: Anthropic.ContentBlock[]): string {
    return content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  private usage(model: string, u: { input_tokens: number; output_tokens: number }, started: number): LlmUsage {
    return {
      provider: "claude",
      model,
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      costUsd: costUsd(model, u.input_tokens, u.output_tokens),
      latencyMs: Date.now() - started,
    };
  }
}
