import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PURVIEWS, SEVERITY_WEIGHT, ScanFindingsBody, artifact, Notifications } from "@tars/contracts";
import { z } from "zod";

const iso = new Date("2026-07-11T00:00:00Z").toISOString();

const validScan = {
  scope: { tenantId: "t", subscriptionIds: ["s"], startedAt: iso, completedAt: iso },
  summary: { total: 1, bySeverity: { critical: 1, high: 0, medium: 0, low: 0, info: 0 } },
  findings: [
    {
      id: "f1",
      title: "x",
      description: "y",
      severity: "critical",
      confidence: 0.9,
      category: "network",
      resource: { id: "r", type: "t", name: "n" },
      evidence: "e",
      detectionMethod: "m",
      frameworks: [],
      discoveredAt: iso,
    },
  ],
};

test("ScanFindingsBody accepts a valid body", () => {
  const parsed = ScanFindingsBody.parse(validScan);
  assert.equal(parsed.findings[0]!.severity, "critical");
});

test("ScanFindingsBody rejects an invalid severity", () => {
  const bad = structuredClone(validScan);
  (bad.findings[0] as { severity: string }).severity = "catastrophic";
  assert.throws(() => ScanFindingsBody.parse(bad));
});

test("ScanFindingsBody rejects out-of-range confidence", () => {
  const bad = structuredClone(validScan);
  (bad.findings[0] as { confidence: number }).confidence = 2;
  assert.throws(() => ScanFindingsBody.parse(bad));
});

test("severity weights order critical > info", () => {
  assert.ok(SEVERITY_WEIGHT.critical > SEVERITY_WEIGHT.high);
  assert.ok(SEVERITY_WEIGHT.high > SEVERITY_WEIGHT.info);
});

test("default purviews scope raw evidence away from the business owner", () => {
  assert.equal(DEFAULT_PURVIEWS.business_owner.seeRawEvidence, false);
  assert.equal(DEFAULT_PURVIEWS.security_analyst.seeRawEvidence, true);
});

test("artifact() factory pins the kind literal", () => {
  const Kinded = artifact("scan_findings", z.object({ ok: z.boolean() }));
  const parsed = Kinded.parse({
    id: "a1",
    kind: "scan_findings",
    schemaVersion: "0.1.0",
    customerId: "c",
    runId: "r",
    producedBy: { agentId: "x", provider: "claude" },
    createdAt: iso,
    inputs: [],
    body: { ok: true },
  });
  assert.equal(parsed.kind, "scan_findings");
  assert.ok(Notifications); // sanity: notifications artifact schema is exported
});
