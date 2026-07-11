import { scaleSqrt } from "d3-scale";
import type { Severity } from "@tars/contracts";
import { SEVERITY_COLOR } from "../../lib/sample";

/** Node fill = 18% severity tint (matches Pill vocabulary). */
export function severityFill(severity: Severity): string {
  return `color-mix(in srgb, ${SEVERITY_COLOR[severity]} 18%, transparent)`;
}

export function severityStroke(severity: Severity): string {
  return SEVERITY_COLOR[severity];
}

/** Risk score → node radius (px). Discrete token lookups only — never interpolate CSS vars. */
export function riskRadiusScale(min = 10, max = 22) {
  return scaleSqrt().domain([0, 100]).range([min, max]).clamp(true);
}

/** SVG marker id for directed attack-chain edges. */
export const ARROW_MARKER_ID = "tars-attack-arrow";

export function ArrowMarkerDefs({ color = "var(--muted)" }: { color?: string }) {
  return (
    <defs>
      <marker
        id={ARROW_MARKER_ID}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
      </marker>
    </defs>
  );
}
