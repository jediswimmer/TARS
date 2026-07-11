import { z } from "zod";
import { BaseAgent } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type Artifact,
  type ReviewedFindingsBody,
  type ScanFindingsBody,
  FindingReview,
} from "@tars/contracts";

const ReviewerOutput = z.object({
  overallRiskScore: z.number(),
  postureSummary: z.string(),
  reviews: z.array(FindingReview),
});

export const REVIEWER_SYSTEM = `You are a principal security analyst reviewing the raw output of an automated adversarial Azure scan before it reaches a customer. Your job is to turn raw findings into decision-grade analysis.

For each finding:
- Decide 'validated' (is this a real issue given the evidence?) and 'falsePositive' (does the evidence NOT actually support it?). A finding can be valid but low-risk.
- Score 'riskScore' 0–100 from likelihood × business impact, not from severity alone.
- Assess 'exploitability' (what an attacker needs, how hard) and 'businessImpact' in plain language a non-technical executive would understand.
- Correlate: if several findings chain into a worse attack path, note the related finding ids in 'correlatedFindingIds'.
- Give concrete 'remediation' with ordered steps, an effort estimate, and a priority (1 = do first).
Be rigorous and skeptical — removing a false positive is as valuable as confirming a real risk. Then give an 'overallRiskScore' (0–100) and a 2–4 sentence 'postureSummary'.`;

export class AzureSecurityReviewer extends BaseAgent<ReviewedFindingsBody> {
  readonly definition: AgentDefinition = {
    id: "azure-security-reviewer",
    name: "Azure Security Reviewer",
    description: "Reviews the adversarial scan and produces a detailed, risk-scored analysis with remediation.",
    version: "0.1.0",
    provider: "claude",
    consumes: ["scan_findings"],
    produces: "reviewed_findings",
    schedule: "0 3 * * *", // runs after the scanner
  };

  protected async produce(ctx: AgentContext): Promise<{ body: ReviewedFindingsBody; usage?: AgentResult["usage"] }> {
    const scan = ctx.inputs.find((a) => a.kind === "scan_findings") as Artifact<"scan_findings", ScanFindingsBody> | undefined;
    if (!scan) throw new Error("azure-security-reviewer requires a scan_findings input artifact");
    const body = scan.body;

    const result = await ctx.llm.complete({
      system: REVIEWER_SYSTEM,
      schema: ReviewerOutput,
      schemaName: "reviewed_findings",
      messages: [
        {
          role: "user",
          content:
            `Review these ${body.findings.length} scan findings. Echo each finding's exact id in your review.\n\n` +
            "```json\n" +
            JSON.stringify(body.findings, null, 2) +
            "\n```",
        },
      ],
    });

    const out = result.parsed ?? { overallRiskScore: 0, postureSummary: "No structured output returned.", reviews: [] };
    const reviewed: ReviewedFindingsBody = {
      scanArtifactId: scan.id,
      reviewedCount: out.reviews.length,
      validatedCount: out.reviews.filter((r) => r.validated && !r.falsePositive).length,
      falsePositiveCount: out.reviews.filter((r) => r.falsePositive).length,
      overallRiskScore: out.overallRiskScore,
      postureSummary: out.postureSummary,
      reviews: out.reviews,
    };
    return { body: reviewed, usage: result.usage };
  }
}
