import { z } from "zod";
import { artifact } from "../artifact.js";
import { Severity } from "../severity.js";

/**
 * A visualization spec is DATA, not a chart image. The portal renders it with a
 * real charting library; the two POV agents only decide WHAT to show and how to
 * prioritize it. `dataRef` points into the report/reviewed-findings body.
 */
export const VizType = z.enum(["kpi", "donut", "bar", "line", "heatmap", "gauge", "table"]);
export type VizType = z.infer<typeof VizType>;

export const VizSpec = z.object({
  id: z.string(),
  type: VizType,
  title: z.string(),
  description: z.string().optional(),
  dataRef: z.string().describe("selector into the source artifact, e.g. 'summary.bySeverity'"),
  /** 1 = the hero chart. Drives the dashboard's priority ordering + drill-down. */
  priority: z.number().int().min(1),
});
export type VizSpec = z.infer<typeof VizSpec>;

export const HeadlineMetric = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
  /** How the dashboard should color it — good/bad/neutral, not raw direction. */
  intent: z.enum(["positive", "negative", "neutral"]),
});
export type HeadlineMetric = z.infer<typeof HeadlineMetric>;

const ReportViewShape = {
  reportArtifactId: z.string(),
  narrative: z.string().describe("audience-tailored prose"),
  headlineMetrics: z.array(HeadlineMetric),
  visualizations: z.array(VizSpec),
  callouts: z.array(z.object({ severity: Severity, title: z.string(), body: z.string() })),
};

/**
 * Executive view — POV of the business owner / decision-maker. Risk, money,
 * compliance status, trend. No raw exploit detail.
 */
export const ExecutiveViewBody = z.object({ audience: z.literal("executive"), ...ReportViewShape });
export type ExecutiveViewBody = z.infer<typeof ExecutiveViewBody>;
export const ExecutiveView = artifact("executive_view", ExecutiveViewBody);

/**
 * Technical view — POV of the VP / IT Director at a publicly-traded company.
 * Full technical detail, control mappings, audit evidence, remediation runbooks.
 */
export const TechnicalViewBody = z.object({ audience: z.literal("technical"), ...ReportViewShape });
export type TechnicalViewBody = z.infer<typeof TechnicalViewBody>;
export const TechnicalView = artifact("technical_view", TechnicalViewBody);
