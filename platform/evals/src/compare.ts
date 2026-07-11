import type {
  LlmUsage,
  ProviderId,
  ReviewedFindingsBody,
  ScanFindingsBody,
  SecurityReportBody,
  Severity,
} from "@tars/contracts";
import { RUBRIC } from "./rubric.js";

/** One provider's output for the same pipeline input — the unit of comparison. */
export interface ProviderRun {
  provider: ProviderId;
  scan: ScanFindingsBody;
  reviewed: ReviewedFindingsBody;
  /** Canonical security report — used by the LLM judge when present. */
  report?: SecurityReportBody;
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

/** Title window used for baseline matching (case-insensitive contains). */
const TITLE_MATCH_CHARS = 12;

function titleMatches(scanTitle: string, baselineTitle: string): boolean {
  return scanTitle.toLowerCase().includes(baselineTitle.toLowerCase().slice(0, TITLE_MATCH_CHARS));
}

function findMatch(
  scanFindings: { title: string; severity: Severity }[],
  baseline: { title: string; severity: Severity },
): { title: string; severity: Severity } | undefined {
  return scanFindings.find((f) => titleMatches(f.title, baseline.title));
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
export function coverage(run: ProviderRun, baseline?: Baseline): number {
  if (!baseline || baseline.findings.length === 0) return 0.5; // unknown → neutral
  const hit = baseline.findings.filter((b) => findMatch(run.scan.findings, b)).length;
  return hit / baseline.findings.length;
}

/**
 * Per-finding severity accuracy vs baseline.
 * Matched + severity equal → 1.0; matched but wrong severity → 0.5; unmatched → 0.0.
 */
export function severityAccuracy(run: ProviderRun, baseline?: Baseline): number {
  if (!baseline || baseline.findings.length === 0) return 0.5;
  const scores = baseline.findings.map((b) => {
    const match = findMatch(run.scan.findings, b);
    if (!match) return 0;
    return match.severity === b.severity ? 1 : 0.5;
  });
  return scores.reduce((s, n) => s + n, 0) / scores.length;
}

/**
 * Score and rank provider runs against the shared rubric. Structural dimensions
 * are computed here; the qualitative `reportQuality` comes from a neutral LLM
 * judge (pass `judgeScores`). Cost + latency are normalized relative to the
 * best run in the set (cheapest/fastest = 1.0).
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
      severityAccuracy: severityAccuracy(run, opts.baseline),
      reportQuality: opts.judgeScores?.[run.provider] ?? 0.5, // neutral until judged
      cost: m.totalCostUsd > 0 ? minCost / m.totalCostUsd : 1,
      latency: m.totalLatencyMs > 0 ? minLatency / m.totalLatencyMs : 1,
    };
    const composite = RUBRIC.reduce((sum, d) => sum + d.weight * (dims[d.key] ?? 0), 0);
    return { provider: run.provider, metrics: m, dimensions: dims, composite };
  });

  return scores.sort((a, b) => b.composite - a.composite);
}
