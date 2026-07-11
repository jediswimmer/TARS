import { z } from "zod";
import { BaseAgent, newId, nowIso } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type ProviderId,
  type ScanFindingsBody,
  ScanFinding,
  type SeverityCounts,
  type Severity,
} from "@tars/contracts";
import type { AzureEnvironmentSnapshot } from "@tars/connectors";
import { DEFAULT_PROMPTS, type FleetPrompts } from "./prompts.js";

/** The model returns findings WITHOUT id/discoveredAt — we stamp those ourselves. */
const ScannerFinding = ScanFinding.omit({ id: true, discoveredAt: true });
const ScannerOutput = z.object({
  findings: z.array(ScannerFinding),
  scannerNotes: z.string().optional(),
});

function countBySeverity(findings: { severity: Severity }[]): SeverityCounts {
  const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}

export class AzureSecurityScanner extends BaseAgent<ScanFindingsBody> {
  readonly definition: AgentDefinition;
  private readonly system: string;

  constructor(opts: { provider: ProviderId; prompts?: FleetPrompts }) {
    super();
    this.system = opts.prompts?.scanner ?? DEFAULT_PROMPTS.scanner;
    this.definition = {
      id: "azure-security-scanner",
      name: "Azure Security Scanner",
      description: "Runs an adversarial security scan of a Microsoft Azure environment and documents all findings.",
      version: "0.1.0",
      provider: opts.provider,
      consumes: [],
      produces: "scan_findings",
      schedule: "0 2 * * *",
    };
  }

  protected async produce(ctx: AgentContext): Promise<{ body: ScanFindingsBody; usage?: AgentResult["usage"] }> {
    const snapshot = ctx.config.snapshot as AzureEnvironmentSnapshot | undefined;
    if (!snapshot) throw new Error("azure-security-scanner requires ctx.config.snapshot (AzureEnvironmentSnapshot)");

    const startedAt = nowIso();
    const result = await ctx.llm.complete({
      system: this.system,
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
    const findings = raw.findings.map((f) => ({ ...f, id: newId("finding"), discoveredAt: nowIso() }));

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
