/**
 * The bake-off rubric. Each dimension is scored 0–1 (higher = better) per
 * provider run; the weighted sum is the composite the ranking uses. Tune the
 * weights to match what the MSP values (e.g. weight false-positive rate heavily
 * if analyst time is the bottleneck).
 */
export interface RubricDimension {
  key: string;
  label: string;
  weight: number;
  /** How the score is obtained: computed from artifacts, or judged by a neutral LLM. */
  source: "structural" | "llm-judge";
}

export const RUBRIC: RubricDimension[] = [
  { key: "coverage", label: "Finding coverage vs. known baseline", weight: 0.25, source: "structural" },
  { key: "falsePositiveRate", label: "Low false-positive rate", weight: 0.2, source: "structural" },
  { key: "severityAccuracy", label: "Severity accuracy vs. baseline", weight: 0.15, source: "structural" },
  { key: "reportQuality", label: "Report clarity & usefulness", weight: 0.2, source: "llm-judge" },
  { key: "cost", label: "Cost efficiency", weight: 0.1, source: "structural" },
  { key: "latency", label: "Latency", weight: 0.1, source: "structural" },
];

export const RUBRIC_WEIGHT_TOTAL = RUBRIC.reduce((sum, d) => sum + d.weight, 0);
