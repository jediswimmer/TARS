import type { ProviderId, SecurityReportBody } from "@tars/contracts";

/** Opaque labels used to blind the judge to provider identity. */
const BLIND_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

export type JudgeComplete = (system: string, user: string) => Promise<string>;

export interface JudgeInput {
  provider: ProviderId;
  report: SecurityReportBody;
}

const JUDGE_SYSTEM = `You are an independent security-report quality judge for an MSP customer portal.
Score each blinded report on clarity, usefulness, and actionability for a business audience.
Do NOT guess which vendor produced a report. Score only the text you are given.

Return ONLY valid JSON of the form:
{"scores":{"A":0.0,"B":0.0}}
Each score must be a number from 0 to 1 (higher = better). Include every report label you were given.`;

function excerpt(report: SecurityReportBody): Record<string, unknown> {
  return {
    executiveSummary: report.executiveSummary,
    riskPosture: report.riskPosture,
    keyFindings: report.keyFindings.slice(0, 8),
    remediationRoadmap: report.remediationRoadmap.slice(0, 3),
    sections: report.sections.slice(0, 4).map((s) => ({
      heading: s.heading,
      body: s.body.slice(0, 800),
    })),
  };
}

/** Clamp a numeric score into [0, 1]. */
export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

/**
 * Parse a judge model response into per-label scores.
 * Accepts either `{"scores":{"A":0.8}}` or a flat `{"A":0.8}` object.
 */
export function parseJudgeResponse(raw: string, labels: string[]): Record<string, number> {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Judge response contained no JSON object");
  }
  const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  const scoresObj =
    parsed.scores && typeof parsed.scores === "object" && !Array.isArray(parsed.scores)
      ? (parsed.scores as Record<string, unknown>)
      : parsed;

  const out: Record<string, number> = {};
  for (const label of labels) {
    const v = scoresObj[label];
    if (typeof v !== "number") {
      throw new Error(`Judge response missing numeric score for label ${label}`);
    }
    out[label] = clampScore(v);
  }
  return out;
}

/**
 * Blinded LLM-as-judge for reportQuality. Inject `complete` so @tars/evals
 * stays free of vendor SDKs; the bake-off wires Claude (or another provider).
 */
export async function judgeReportQuality(
  inputs: JudgeInput[],
  complete: JudgeComplete,
): Promise<Record<ProviderId, number>> {
  if (inputs.length === 0) return {} as Record<ProviderId, number>;
  if (inputs.length > BLIND_LABELS.length) {
    throw new Error(`Judge supports at most ${BLIND_LABELS.length} reports per call`);
  }

  const mapping = inputs.map((input, i) => ({
    label: BLIND_LABELS[i]!,
    provider: input.provider,
    excerpt: excerpt(input.report),
  }));

  const user = [
    "Score these blinded security reports. Labels are arbitrary.",
    "",
    ...mapping.map((m) => `### Report ${m.label}\n${JSON.stringify(m.excerpt, null, 2)}`),
    "",
    `Return JSON scores for labels: ${mapping.map((m) => m.label).join(", ")}`,
  ].join("\n");

  const raw = await complete(JUDGE_SYSTEM, user);
  const byLabel = parseJudgeResponse(
    raw,
    mapping.map((m) => m.label),
  );

  const result = {} as Record<ProviderId, number>;
  for (const m of mapping) {
    result[m.provider] = byLabel[m.label]!;
  }
  return result;
}

/** Neutral equal scores — used offline so bake-off stays credential-free. */
export function neutralJudgeScores(providers: ProviderId[]): Record<ProviderId, number> {
  const out = {} as Record<ProviderId, number>;
  for (const p of providers) out[p] = 0.5;
  return out;
}
