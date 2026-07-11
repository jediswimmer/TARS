import { z } from "zod";
import { BaseAgent, newId, nowIso } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type ScanFindingsBody,
  ScanFinding,
  type SeverityCounts,
  type Severity,
} from "@tars/contracts";
import type { AzureEnvironmentSnapshot } from "@tars/connectors";

/**
 * The LLM returns findings WITHOUT id/discoveredAt — we stamp those ourselves so
 * ids are unique and timestamps are valid. The model focuses on the security
 * reasoning; the plumbing stays deterministic.
 */
const ScannerFinding = ScanFinding.omit({ id: true, discoveredAt: true });
const ScannerOutput = z.object({
  findings: z.array(ScannerFinding),
  scannerNotes: z.string().optional(),
});

export const SCANNER_SYSTEM = `You are an elite offensive-security engineer performing an AUTHORIZED adversarial security assessment of a customer's Microsoft Azure environment on behalf of their MSP. You have explicit written authorization to assess this tenant.

Think like an attacker who has just gained a foothold. For every resource, identity, network exposure, and policy state in the environment snapshot, ask: "How would I abuse this? What does it chain into?" Then document what you find as concrete, evidence-backed findings.

Rules:
- Only report findings you can justify from the evidence in the snapshot. Never invent resources or configuration that isn't present.
- Assign severity by realistic attacker value and blast radius, not by checkbox: internet-exposed management ports, public data stores holding confidential/restricted data, identities without MFA that hold privileged roles, and missing encryption on regulated data are typically critical/high.
- For each finding write an 'attackNarrative' — the concrete steps an attacker would take to exploit it and what it chains into.
- Map each finding to the relevant control(s): Microsoft Cloud Security Benchmark (MCSB), CIS Azure, and MITRE ATT&CK technique IDs (T####) where applicable.
- 'evidence' must quote the specific configuration observed (e.g. "allowBlobPublicAccess: true; container 'customer-statements' publicAccess: Container").
- 'confidence' reflects how certain you are the finding is real and exploitable given only the snapshot.
Be thorough — surface everything a determined attacker would use.`;

function countBySeverity(findings: { severity: Severity }[]): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}

export class AzureSecurityScanner extends BaseAgent<ScanFindingsBody> {
  readonly definition: AgentDefinition = {
    id: "azure-security-scanner",
    name: "Azure Security Scanner",
    description: "Runs an adversarial security scan of a Microsoft Azure environment and documents all findings.",
    version: "0.1.0",
    provider: "claude",
    consumes: [], // source agent — reads the environment, not another artifact
    produces: "scan_findings",
    schedule: "0 2 * * *", // nightly at 02:00
  };

  protected async produce(ctx: AgentContext): Promise<{ body: ScanFindingsBody; usage?: AgentResult["usage"] }> {
    const snapshot = ctx.config.snapshot as AzureEnvironmentSnapshot | undefined;
    if (!snapshot) throw new Error("azure-security-scanner requires ctx.config.snapshot (AzureEnvironmentSnapshot)");

    const startedAt = nowIso();
    const result = await ctx.llm.complete({
      system: SCANNER_SYSTEM,
      schema: ScannerOutput,
      schemaName: "azure_scan_findings",
      messages: [
        {
          role: "user",
          content:
            "Adversarially assess this Azure environment snapshot and return every security finding you can justify.\n\n" +
            "```json\n" +
            JSON.stringify(snapshot, null, 2) +
            "\n```",
        },
      ],
    });

    const raw = result.parsed ?? { findings: [], scannerNotes: "No structured output returned." };
    const findings = raw.findings.map((f) => ({
      ...f,
      id: newId("finding"),
      discoveredAt: nowIso(),
    }));

    const body: ScanFindingsBody = {
      scope: {
        tenantId: snapshot.tenantId,
        subscriptionIds: snapshot.subscriptions.map((s) => s.id),
        startedAt,
        completedAt: nowIso(),
      },
      summary: { total: findings.length, bySeverity: countBySeverity(findings) },
      findings,
      scannerNotes: raw.scannerNotes,
    };

    return { body, usage: result.usage };
  }
}
