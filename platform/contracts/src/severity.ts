import { z } from "zod";

/**
 * A single severity vocabulary is used across the ENTIRE fleet — the scanner
 * assigns it, the reviewer may adjust it, the report rolls it up, and the
 * dashboard colors by it. Keeping one enum means a "high" means the same thing
 * end-to-end regardless of which LLM produced the artifact.
 */
export const Severity = z.enum(["critical", "high", "medium", "low", "info"]);
export type Severity = z.infer<typeof Severity>;

/** Numeric weight for sorting / prioritization (higher = more severe). */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/** Sort helper: most severe first. */
export function bySeverityDesc<T extends { severity: Severity }>(a: T, b: T): number {
  return SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
}

export const SeverityCounts = z.object({
  critical: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
  info: z.number().int().nonnegative(),
});
export type SeverityCounts = z.infer<typeof SeverityCounts>;
