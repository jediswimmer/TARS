// Visual vocabulary shared by every D3 chart. NO React and NO CSS `var()`
// interpolation inside D3 — we only ever do discrete token lookups so the charts
// track the light/dark theme by reference, never by computed color. The single
// genuine D3 scale is `scaleSqrt` for riskScore → radius (area-proportional).
import { scaleSqrt } from "d3-scale";
import type { Severity } from "@tars/contracts";
import { SEVERITY_COLOR } from "../../lib/sample";
import type { TopoNodeKind } from "../../lib/viz-selectors";

/** Solid stroke / text color for a severity (a CSS var, resolved by the theme). */
export function severityColor(severity: Severity): string {
  return SEVERITY_COLOR[severity];
}

/** Translucent node fill matching the Pill vocabulary: 18% token over transparent. */
export function severityFill(severity: Severity): string {
  return `color-mix(in srgb, ${SEVERITY_COLOR[severity]} 18%, transparent)`;
}

/** Severity ordering, most-severe first — for legends and stable sort. */
export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

/** Node fill by topology node kind (non-finding nodes use neutral surfaces). */
export const NODE_KIND_COLOR: Record<TopoNodeKind, string> = {
  internet: "var(--muted)",
  subscription: "var(--accent)",
  resource: "var(--ink)",
  identity: "var(--color-med)",
};

/** riskScore (0–100) → circle radius, area-proportional via square-root scale. */
export function makeRiskRadius(minR = 10, maxR = 30) {
  return scaleSqrt().domain([0, 100]).range([minR, maxR]).clamp(true);
}

/** Stable SVG marker id for directed-edge arrowheads (referenced by chart defs). */
export const ARROW_MARKER_ID = "viz-arrowhead";
export const ARROW_MARKER_MUTUAL_ID = "viz-arrowhead-mutual";
