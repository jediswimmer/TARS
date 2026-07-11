import { BaseAgent } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type Artifact,
  type ReviewedFindingsBody,
  type ScanFindingsBody,
  type SecurityReportBody,
  SecurityReportBody as SecurityReportBodySchema,
} from "@tars/contracts";

// The LLM authors everything except customer/period, which we inject from config.
const ReportAuthorOutput = SecurityReportBodySchema.omit({ customer: true, period: true });

export const REPORT_AUTHOR_SYSTEM = `You are a senior security technical writer producing the canonical, audience-neutral security assessment report for an MSP customer. This single report is the source of truth from which both an executive view and a deep technical view are later derived — so it must be complete and precise, but neutral in framing.

From the reviewed findings, produce:
- An 'executiveSummary' (crisp, outcome-first, no jargon).
- A 'riskPosture' with a 0–100 score, a rating, and a trend if inferable.
- 'keyFindings': the handful that matter most, each with a one-line headline.
- A phased 'remediationRoadmap' ("Immediate (0–7 days)", "Short term (30 days)", "Strategic (90 days)") ordered by the reviewers' priorities.
- A 'complianceMapping' estimating coverage and gaps per framework (MCSB, CIS_AZURE, SOC2, ISO_27001, SOX where relevant to a publicly-traded company).
- Structured 'sections' in Markdown covering methodology, findings detail, and remediation.
Write clearly and factually. Reference finding ids so downstream views can link back.`;

export class ReportAuthor extends BaseAgent<SecurityReportBody> {
  readonly definition: AgentDefinition = {
    id: "report-author",
    name: "Security Report Author",
    description: "Technical-documentation specialist. Turns reviewed findings into the canonical security report.",
    version: "0.1.0",
    provider: "claude",
    consumes: ["reviewed_findings", "scan_findings"],
    produces: "security_report",
    schedule: "0 4 * * *",
  };

  protected async produce(ctx: AgentContext): Promise<{ body: SecurityReportBody; usage?: AgentResult["usage"] }> {
    const reviewed = ctx.inputs.find((a) => a.kind === "reviewed_findings") as
      | Artifact<"reviewed_findings", ReviewedFindingsBody>
      | undefined;
    const scan = ctx.inputs.find((a) => a.kind === "scan_findings") as
      | Artifact<"scan_findings", ScanFindingsBody>
      | undefined;
    if (!reviewed) throw new Error("report-author requires a reviewed_findings input artifact");

    const customer = (ctx.config.customer as { id: string; name: string } | undefined) ?? {
      id: ctx.customerId,
      name: ctx.customerId,
    };
    const period = (ctx.config.period as { from: string; to: string } | undefined) ?? {
      from: reviewed.createdAt,
      to: reviewed.createdAt,
    };

    const result = await ctx.llm.complete({
      system: REPORT_AUTHOR_SYSTEM,
      schema: ReportAuthorOutput,
      schemaName: "security_report",
      messages: [
        {
          role: "user",
          content:
            `Author the security report for ${customer.name}.\n\n` +
            `REVIEWED FINDINGS:\n\`\`\`json\n${JSON.stringify(reviewed.body, null, 2)}\n\`\`\`\n\n` +
            `RAW SCAN FINDINGS (for technical detail):\n\`\`\`json\n${JSON.stringify(scan?.body.findings ?? [], null, 2)}\n\`\`\``,
        },
      ],
    });

    const authored = result.parsed;
    if (!authored) throw new Error("report-author: no structured output returned");
    return { body: { ...authored, customer, period }, usage: result.usage };
  }
}
