import { z } from "zod";
import type { ZodType } from "zod";

/**
 * The three implementations live in providers/{claude,grok,sol}. Each one
 * implements the LlmProvider PORT below and nothing else changes. This single
 * interface is what makes the bake-off fair: identical inputs, identical output
 * contract — only the model behind it varies.
 */
export const ProviderId = z.enum(["claude", "grok", "sol"]);
export type ProviderId = z.infer<typeof ProviderId>;

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmCompleteOptions<T = unknown> {
  /** System prompt — the agent's persona + task framing. */
  system?: string;
  messages: LlmMessage[];
  /** Overrides the provider's default model for this call. */
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /**
   * When set, the provider MUST coerce the model into returning JSON matching
   * this schema (tool-use / json-mode / structured outputs — provider's choice)
   * and return it as `parsed`. This is how agents get typed artifacts back.
   */
  schema?: ZodType<T>;
  schemaName?: string;
  schemaDescription?: string;
}

export interface LlmUsage {
  provider: ProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Populated by the provider when it knows its own pricing. Powers the cost column of the bake-off. */
  costUsd?: number;
  latencyMs?: number;
}

export interface LlmResult<T = unknown> {
  text: string;
  /** Present iff a schema was supplied and parsing succeeded. */
  parsed?: T;
  usage: LlmUsage;
  stopReason?: string;
}

/**
 * The one interface every provider adapter implements.
 * Keep it minimal — richer capabilities belong in @tars/core, built ON TOP of this.
 */
export interface LlmProvider {
  readonly id: ProviderId;
  readonly defaultModel: string;
  complete<T = unknown>(opts: LlmCompleteOptions<T>): Promise<LlmResult<T>>;
}
