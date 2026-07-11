import { z } from "zod";
import { artifact } from "../artifact.js";
import { Severity } from "../severity.js";
import { Framework } from "../frameworks.js";

export const PostureRating = z.enum(["critical", "poor", "fair", "good", "strong"]);
export type PostureRating = z.infer<typeof PostureRating>;

export const ReportSection = z.object({
  id: z.string(),
  heading: z.string(),
  level: z.number().int().min(1).max(4),
  /** Markdown. Rendered by both POV views + the portal. */
  body: z.string(),
  findingIds: z.array(z.string()),
});
export type ReportSection = z.infer<typeof ReportSection>;

/**
 * The canonical, audience-neutral report authored by the technical-documentation
 * agent. The Executive and Technical views are DERIVED from this — one source of
 * truth, two renderings.
 */
export const SecurityReportBody = z.object({
  customer: z.object({ id: z.string(), name: z.string() }),
  period: z.object({ from: z.iso.datetime(), to: z.iso.datetime() }),
  scope: z.string(),
  executiveSummary: z.string(),
  riskPosture: z.object({
    score: z.number().min(0).max(100),
    rating: PostureRating,
    trend: z.enum(["improving", "stable", "worsening"]).optional(),
  }),
  keyFindings: z.array(
    z.object({ findingId: z.string(), headline: z.string(), severity: Severity }),
  ),
  remediationRoadmap: z.array(
    z.object({
      phase: z.string().describe("e.g. 'Immediate (0–7 days)'"),
      items: z.array(
        z.object({
          findingId: z.string(),
          action: z.string(),
          owner: z.string().optional(),
          dueBy: z.string().optional(),
        }),
      ),
    }),
  ),
  complianceMapping: z.array(
    z.object({
      framework: Framework,
      coverage: z.number().min(0).max(1).describe("fraction of assessed controls passing"),
      gaps: z.array(z.string()),
    }),
  ),
  sections: z.array(ReportSection),
});
export type SecurityReportBody = z.infer<typeof SecurityReportBody>;

export const SecurityReport = artifact("security_report", SecurityReportBody);
