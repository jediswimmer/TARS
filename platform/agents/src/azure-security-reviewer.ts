import { z } from "zod";
import { BaseAgent } from "@tars/core";
import {
  type AgentContext,
  type AgentDefinition,
  type AgentResult,
  type Artifact,
  type ProviderId,
  type ReviewedFindingsBody,
  type ScanFindingsBody,
  FindingReview,
} from "@tars/contracts";
import { DEFAULT_PROMPTS, type FleetPrompts } from "./prompts.js";

const ReviewerOutput = z.object({
  overallRiskScore: z.number(),
  postureSummary: z.string(),
  reviews: z.array(FindingReview),
});

export class AzureSecurityReviewer extends BaseAgent<ReviewedFindingsBody> {
  readonly definition: AgentDefinition;
  private readonly system: string;

  constructor(opts: { provider: ProviderId; prompts?: FleetPrompts }) {
    super();
    this.system = opts.prompts?.reviewer ?? DEFAULT_PROMPTS.reviewer;
    this.definition = {
      id: "azure-security-reviewer",
      name: "Azure Security Reviewer",
      description: "Reviews the adversarial scan and produces a detailed, risk-scored analysis with remediation.",
      version: "0.1.0",
      provider: opts.provider,
      consumes: ["scan_findings"],
      produces: "reviewed_findings",
      schedule: "0 3 * * *",
    };
  }

  protected async produce(ctx: AgentContext): Promise<{ body: ReviewedFindingsBody; usage?: AgentResult["usage"] }> {
    const scan = ctx.inputs.find((a) => a.kind === "scan_findings") as Artifact<"scan_findings", ScanFindingsBody> | undefined;
    if (!scan) throw new Error("azure-security-reviewer requires a scan_findings input artifact");

    const result = await ctx.llm.complete({
      system: this.system,
      schema: ReviewerOutput,
      schemaName: "reviewed_findings",
      messages: [
        {
          role: "user",
          content:
            `Review these ${scan.body.findings.length} scan findings. Echo each finding's exact id in your review.\n\n` +
            "```json\n" +
            JSON.stringify(scan.body.findings, null, 2) +
            "\n```",
        },
      ],
    });

    const out = result.parsed ?? { overallRiskScore: 0, postureSummary: "No structured output returned.", reviews: [] };
    const body: ReviewedFindingsBody = {
      scanArtifactId: scan.id,
      reviewedCount: out.reviews.length,
      validatedCount: out.reviews.filter((r) => r.validated && !r.falsePositive).length,
      falsePositiveCount: out.reviews.filter((r) => r.falsePositive).length,
      overallRiskScore: out.overallRiskScore,
      postureSummary: out.postureSummary,
      reviews: out.reviews,
    };
    return { body, usage: result.usage };
  }
}
