import type { LlmUsage, ProviderId, ReviewedFindingsBody, ScanFindingsBody, Severity } from "@tars/contracts";
import { RUBRIC } from "./rubric.js";

/** One provider's output for the same pipeline input — the unit of comparison. */
export interface ProviderRun {
  provider: ProviderId;
  scan: ScanFindingsBody;
  reviewed: ReviewedFindingsBody;
  /** Every model call made during the run (for cost + latency totals). */
  usage: LlmUsage[];
}

/** Optional ground truth to score coverage + severity accuracy against. */
export interface Baseline {
  findings: { title: string; severity: Severity }[];
}

export interface RunMetrics {
  findingsTotal: number;
  falsePositiveRate: number;
  totalCostUsd: number;
  totalLatencyMs: number;
  totalTokens: number;
}

export interface RunScore {
  provider: ProviderId;
  metrics: RunMetrics;
  dimensions: Record<string, number>; // 0–1 per rubric key
  composite: number; // 0–1 weighted
}

function rawMetrics(run: ProviderRun): RunMetrics {
  const r = run.reviewed;
  return {
    findingsTotal: run.scan.summary.total,
    falsePositiveRate: r.reviewedCount ? r.falsePositiveCount / r.reviewedCount : 0,
    totalCostUsd: run.usage.reduce((s, u) => s + (u.costUsd ?? 0), 0),
    totalLatencyMs: run.usage.reduce((s, u) => s + (u.latencyMs ?? 0), 0),
    totalTokens: run.usage.reduce((s, u) => s + u.inputTokens + u.outputTokens, 0),
  };
}

/** Fraction of baseline findings a run surfaced (title match, case-insensitive contains). */
function coverage(run: ProviderRun, baseline?: Baseline): number {
  if (!baseline || baseline.findings.length === 0) return 0.5; // unknown → neutral
  const titles = run.scan.findings.map((f) => f.title.toLowerCase());
  const hit = baseline.findings.filter((b) => titles.some((t) => t.includes(b.title.toLowerCase().slice(0, 12)))).length;
  return hit / baseline.findings.length;
}

/**
 * Score and rank provider runs against the shared rubric. Structural dimensions
 * are computed here; the qualitative `reportQuality` comes from a neutral LLM
 * judge (pass `judgeScores` — a Phase-2 hook). Cost + latency are normalized
 * relative to the best run in the set (cheapest/fastest = 1.0).
 */
export function compareRuns(
  runs: ProviderRun[],
  opts: { baseline?: Baseline; judgeScores?: Record<ProviderId, number> } = {},
): RunScore[] {
  const metrics = runs.map(rawMetrics);
  const minCost = Math.min(...metrics.map((m) => m.totalCostUsd || Infinity));
  const minLatency = Math.min(...metrics.map((m) => m.totalLatencyMs || Infinity));

  const scores: RunScore[] = runs.map((run, i) => {
    const m = metrics[i]!;
    const dims: Record<string, number> = {
      coverage: coverage(run, opts.baseline),
      falsePositiveRate: 1 - m.falsePositiveRate, // fewer FPs = better
      severityAccuracy: opts.baseline ? coverage(run, opts.baseline) : 0.5, // refine with per-finding match in Phase 2
      reportQuality: opts.judgeScores?.[run.provider] ?? 0.5, // neutral until judged
      cost: m.totalCostUsd > 0 ? minCost / m.totalCostUsd : 1,
      latency: m.totalLatencyMs > 0 ? minLatency / m.totalLatencyMs : 1,
    };
    const composite = RUBRIC.reduce((sum, d) => sum + d.weight * (dims[d.key] ?? 0), 0);
    return { provider: run.provider, metrics: m, dimensions: dims, composite };
  });

  return scores.sort((a, b) => b.composite - a.composite);
}
