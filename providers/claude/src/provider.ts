import Anthropic from "@anthropic-ai/sdk";
import type { LlmCompleteOptions, LlmProvider, LlmResult, LlmUsage } from "@tars/contracts";

/** Per-1M-token pricing so the bake-off can report a real cost column. */
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

function costUsd(model: string, inputTokens: number, outputTokens: number): number | undefined {
  const p = PRICING[model];
  if (!p) return undefined;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/** Pull the first JSON object out of a model response, tolerating ``` fences / prose. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]! : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model response");
  return candidate.slice(start, end + 1);
}

/**
 * The Anthropic adapter for the LlmProvider port. This is the ONLY file in the
 * Claude fleet that touches the Anthropic SDK — every agent talks to the port,
 * never to `@anthropic-ai/sdk` directly. Swapping in Grok or Sol means writing
 * the same shape against their SDK; nothing else changes.
 *
 * Structured output: we instruct the model to return JSON and validate it with
 * the caller's Zod schema (throws on mismatch). This keeps the adapter free of
 * any Zod-version coupling with the SDK's structured-output helper.
 */
export class ClaudeProvider implements LlmProvider {
  readonly id = "claude" as const;
  readonly defaultModel: string;
  private readonly client: Anthropic;

  constructor(opts: { apiKey?: string; model?: string } = {}) {
    // Zero-arg client resolves ANTHROPIC_API_KEY / auth profile from the env.
    this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
    this.defaultModel = opts.model ?? process.env.CLAUDE_MODEL ?? "claude-opus-4-8";
  }

  async complete<T = unknown>(opts: LlmCompleteOptions<T>): Promise<LlmResult<T>> {
    const model = opts.model ?? this.defaultModel;
    const started = Date.now();

    const system = opts.schema
      ? `${opts.system ?? ""}\n\nReturn ONLY a single JSON object matching the "${opts.schemaName ?? "output"}" schema. No prose, no markdown fences.`.trim()
      : opts.system;

    const res = await this.client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? 16000,
      ...(system ? { system } : {}),
      thinking: { type: "adaptive" }, // security analysis benefits from reasoning
      output_config: { effort: "high" },
      messages: opts.messages,
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    // Validate against the caller's schema — the type-safe boundary for LLM output.
    const parsed = opts.schema ? (opts.schema.parse(JSON.parse(extractJson(text))) as T) : undefined;

    const usage: LlmUsage = {
      provider: "claude",
      model,
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      costUsd: costUsd(model, res.usage.input_tokens, res.usage.output_tokens),
      latencyMs: Date.now() - started,
    };

    return { text, parsed, stopReason: res.stop_reason ?? undefined, usage };
  }
}
