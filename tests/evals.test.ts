import { test } from "node:test";
import assert from "node:assert/strict";
import { compareRuns, RUBRIC, type Baseline, type ProviderRun } from "@tars/evals";
import type { ProviderId, ReviewedFindingsBody, ScanFindingsBody } from "@tars/contracts";

const BASELINE: Baseline = {
  findings: [
    { title: "RDP (3389) exposed to the internet", severity: "critical" },
    { title: "Global Administrator account has no MFA", severity: "critical" },
    { title: "Storage account allows public blob access", severity: "high" },
  ],
};

function scan(): ScanFindingsBody {
  return {
    scope: { tenantId: "t", subscriptionIds: ["s"], startedAt: "", completedAt: "" },
    summary: { total: 3, bySeverity: { critical: 2, high: 1, medium: 0, low: 0, info: 0 } },
    findings: BASELINE.findings.map((f, i) => ({
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

function reviewed(falsePositives: number): ReviewedFindingsBody {
  return { scanArtifactId: "", reviewedCount: 3, validatedCount: 3 - falsePositives, falsePositiveCount: falsePositives, overallRiskScore: 80, postureSummary: "", reviews: [] };
}

function run(provider: ProviderId, fp: number, cost: number, latency: number): ProviderRun {
  return { provider, scan: scan(), reviewed: reviewed(fp), usage: [{ provider, model: "", inputTokens: 100, outputTokens: 100, costUsd: cost, latencyMs: latency }] };
}

test("rubric weights sum to 1", () => {
  const total = RUBRIC.reduce((s, d) => s + d.weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test("compareRuns ranks the cheaper, lower-false-positive run first", () => {
  const runs = [run("claude", 0, 0.01, 100), run("grok", 2, 0.05, 300)];
  const scored = compareRuns(runs, { baseline: BASELINE });
  assert.equal(scored[0]!.provider, "claude");
  assert.ok(scored[0]!.composite >= scored[1]!.composite);
  for (const s of scored) {
    assert.ok(s.composite >= 0 && s.composite <= 1);
    assert.ok(s.dimensions.coverage > 0.9); // titles match the baseline
  }
});
