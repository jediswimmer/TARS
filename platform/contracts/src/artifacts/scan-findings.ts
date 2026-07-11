import { z } from "zod";
import { artifact } from "../artifact.js";
import { Severity, SeverityCounts } from "../severity.js";
import { FrameworkReference } from "../frameworks.js";

/** Category taxonomy — used to group findings on the dashboard + route to owners. */
export const FindingCategory = z.enum([
  "identity", // IAM, RBAC, conditional access, MFA
  "network", // NSGs, exposed ports, public IPs, firewalls
  "data", // storage exposure, encryption, key management
  "logging", // diagnostic settings, retention, alerting gaps
  "configuration", // insecure defaults, drift, missing hardening
  "vulnerability", // unpatched, EOL, known CVEs
  "compliance", // policy/benchmark violations
]);
export type FindingCategory = z.infer<typeof FindingCategory>;

export const AzureResourceRef = z.object({
  id: z.string().describe("full ARM resource id"),
  type: z.string().describe("e.g. Microsoft.Storage/storageAccounts"),
  name: z.string(),
  location: z.string().optional(),
  subscriptionId: z.string().optional(),
  resourceGroup: z.string().optional(),
});
export type AzureResourceRef = z.infer<typeof AzureResourceRef>;

/** One finding from the adversarial scan. This is the atom the whole fleet operates on. */
export const ScanFinding = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: Severity,
  confidence: z.number().min(0).max(1).describe("scanner's confidence this is real, 0–1"),
  category: FindingCategory,
  resource: AzureResourceRef,
  evidence: z.string().describe("what was actually observed that proves the finding"),
  detectionMethod: z.string().describe("how the scanner found it (query, API, heuristic)"),
  /** Adversarial POV: how an attacker would abuse this. The reviewer builds on this. */
  attackNarrative: z.string().optional(),
  frameworks: z.array(FrameworkReference),
  discoveredAt: z.iso.datetime(),
});
export type ScanFinding = z.infer<typeof ScanFinding>;

export const ScanFindingsBody = z.object({
  scope: z.object({
    tenantId: z.string(),
    subscriptionIds: z.array(z.string()),
    startedAt: z.iso.datetime(),
    completedAt: z.iso.datetime(),
  }),
  summary: z.object({
    total: z.number().int().nonnegative(),
    bySeverity: SeverityCounts,
  }),
  findings: z.array(ScanFinding),
  scannerNotes: z.string().optional(),
});
export type ScanFindingsBody = z.infer<typeof ScanFindingsBody>;

export const ScanFindings = artifact("scan_findings", ScanFindingsBody);
