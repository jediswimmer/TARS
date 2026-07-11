import { z } from "zod";
import { artifact } from "../artifact.js";

export const Likelihood = z.enum(["rare", "unlikely", "possible", "likely", "almost_certain"]);
export type Likelihood = z.infer<typeof Likelihood>;

export const Effort = z.enum(["low", "medium", "high"]);
export type Effort = z.infer<typeof Effort>;

export const Remediation = z.object({
  summary: z.string(),
  steps: z.array(z.string()),
  effort: Effort,
  /** 1 = do first. The report's roadmap is ordered by this. */
  priority: z.number().int().min(1),
});
export type Remediation = z.infer<typeof Remediation>;

/**
 * The reviewer's verdict on ONE scan finding: validate it, kill false positives,
 * score the risk, and attach remediation. This is where raw scanner output
 * becomes decision-grade.
 */
export const FindingReview = z.object({
  findingId: z.string(),
  validated: z.boolean(),
  falsePositive: z.boolean(),
  riskScore: z.number().min(0).max(100),
  likelihood: Likelihood,
  businessImpact: z.string().describe("plain-language consequence if exploited"),
  exploitability: z.string().describe("how hard, what an attacker needs"),
  correlatedFindingIds: z.array(z.string()),
  remediation: Remediation,
  analystNotes: z.string(),
});
export type FindingReview = z.infer<typeof FindingReview>;

export const ReviewedFindingsBody = z.object({
  scanArtifactId: z.string(),
  reviewedCount: z.number().int().nonnegative(),
  validatedCount: z.number().int().nonnegative(),
  falsePositiveCount: z.number().int().nonnegative(),
  overallRiskScore: z.number().min(0).max(100),
  postureSummary: z.string(),
  reviews: z.array(FindingReview),
});
export type ReviewedFindingsBody = z.infer<typeof ReviewedFindingsBody>;

export const ReviewedFindings = artifact("reviewed_findings", ReviewedFindingsBody);
