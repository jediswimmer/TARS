import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareRuns,
  CONTOSO_GOLDEN,
  coverage,
  parseJudgeResponse,
  severityAccuracy,
  RUBRIC,
  type ProviderRun,
} from "@tars/evals";
import type { ProviderId, ReviewedFindingsBody, ScanFindingsBody, Severity } from "@tars/contracts";

function scanWith(
  findings: { title: string; severity: Severity }[],
): ScanFindingsBody {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) bySeverity[f.severity]++;
  return {
    scope: { tenantId: "t", subscriptionIds: ["s"], startedAt: "", completedAt: "" },
    summary: { total: findings.length, bySeverity },
    findings: findings.map((f, i) => ({
      id: `f${i}`,
      title: f.title,
      description: "",
      severity: f.severity,
      confidence: 0.9,
      category: "network",
      resource: { id: "r", type: "t", name: "n" },
      evidence: "",
      detectionMethod: "",
      frameworks: [],
      discoveredAt: "",
    })),
  } as ScanFindingsBody;
}

function reviewed(falsePositives: number, count = 3): ReviewedFindingsBody {
  return {
    scanArtifactId: "",
    reviewedCount: count,
    validatedCount: count - falsePositives,
    falsePositiveCount: falsePositives,
    overallRiskScore: 80,
    postureSummary: "",
    reviews: [],
  };
}

function run(
  provider: ProviderId,
  findings: { title: string; severity: Severity }[],
  fp: number,
  cost: number,
  latency: number,
): ProviderRun {
  return {
    provider,
    scan: scanWith(findings),
    reviewed: reviewed(fp, findings.length || 1),
    usage: [
      {
        provider,
        model: "",
        inputTokens: 100,
        outputTokens: 100,
        costUsd: cost,
        latencyMs: latency,
      },
    ],
  };
}

test("rubric weights sum to 1", () => {
  const total = RUBRIC.reduce((s, d) => s + d.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test("CONTOSO_GOLDEN has the three fixture findings", () => {
  assert.equal(CONTOSO_GOLDEN.findings.length, 3);
  assert.equal(CONTOSO_GOLDEN.findings[0]!.severity, "critical");
});

test("compareRuns ranks the cheaper, lower-false-positive run first", () => {
  const findings = CONTOSO_GOLDEN.findings;
  const runs = [run("claude", findings, 0, 0.01, 100), run("grok", findings, 2, 0.05, 300)];
  const scored = compareRuns(runs, { baseline: CONTOSO_GOLDEN });
  assert.equal(scored[0]!.provider, "claude");
  assert.ok(scored[0]!.composite >= scored[1]!.composite);
  for (const s of scored) {
    assert.ok(s.composite >= 0 && s.composite <= 1);
    assert.ok(s.dimensions.coverage! > 0.9);
  }
});

test("severityAccuracy is 1.0 when titles and severities match", () => {
  const r = run("claude", CONTOSO_GOLDEN.findings, 0, 0.01, 100);
  assert.equal(severityAccuracy(r, CONTOSO_GOLDEN), 1);
  assert.equal(coverage(r, CONTOSO_GOLDEN), 1);
});

test("severityAccuracy is 0.5 when title matches but severity is wrong", () => {
  const findings = CONTOSO_GOLDEN.findings.map((f) => ({
    ...f,
    severity: "low" as Severity,
  }));
  const r = run("grok", findings, 0, 0.01, 100);
  assert.equal(severityAccuracy(r, CONTOSO_GOLDEN), 0.5);
  assert.equal(coverage(r, CONTOSO_GOLDEN), 1);
});

test("severityAccuracy is 0 when baseline findings are missing", () => {
  const r = run("sol", [{ title: "Unrelated finding about DNS", severity: "info" }], 0, 0.01, 100);
  assert.equal(severityAccuracy(r, CONTOSO_GOLDEN), 0);
  assert.equal(coverage(r, CONTOSO_GOLDEN), 0);
});

test("parseJudgeResponse reads nested scores and clamps", () => {
  const parsed = parseJudgeResponse('Here you go:\n{"scores":{"A":0.9,"B":1.5,"C":-0.2}}\n', [
    "A",
    "B",
    "C",
  ]);
  assert.equal(parsed.A, 0.9);
  assert.equal(parsed.B, 1);
  assert.equal(parsed.C, 0);
});

test("parseJudgeResponse accepts flat label maps", () => {
  const parsed = parseJudgeResponse('{"A":0.4,"B":0.6}', ["A", "B"]);
  assert.equal(parsed.A, 0.4);
  assert.equal(parsed.B, 0.6);
});

test("compareRuns uses judgeScores for reportQuality", () => {
  const findings = CONTOSO_GOLDEN.findings;
  const runs = [run("claude", findings, 0, 0.01, 100), run("grok", findings, 0, 0.01, 100)];
  const scored = compareRuns(runs, {
    baseline: CONTOSO_GOLDEN,
    judgeScores: { claude: 0.9, grok: 0.2 },
  });
  assert.equal(scored.find((s) => s.provider === "claude")!.dimensions.reportQuality, 0.9);
  assert.equal(scored.find((s) => s.provider === "grok")!.dimensions.reportQuality, 0.2);
  assert.equal(scored[0]!.provider, "claude");
});
