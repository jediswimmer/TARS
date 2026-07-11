import { VIZ_FINDINGS } from "../../lib/sample-viz";
import { buildAttackChain } from "../../lib/viz-selectors";
import { ChartFrame } from "./ChartFrame";
import { severityColor } from "./theme";

/**
 * The executive/auditor counterpart of the attack-chain graph: aggregate counts
 * and business-impact prose, deliberately WITHOUT resource names, exploit
 * narratives, or the raw topology (their purview excludes raw evidence — see
 * DEFAULT_PURVIEWS in @tars/contracts). Pure presentational, no client hooks.
 */
export function BlastRadiusCard() {
  const chain = buildAttackChain(VIZ_FINDINGS);
  const largest = [...chain.chains].sort((a, b) => b.length - a.length)[0] ?? [];
  const inLargest = new Set(largest);
  const chainNodes = chain.nodes.filter((n) => inLargest.has(n.id));
  const worst = [...chainNodes].sort((a, b) => b.riskScore - a.riskScore)[0];
  const maxRisk = Math.max(0, ...chain.nodes.map((n) => n.riskScore));

  const stats = [
    { label: "Validated findings", value: chain.nodes.length },
    { label: "Linked into a chain", value: largest.length },
    { label: "Highest risk", value: `${maxRisk}/100` },
  ];

  return (
    <ChartFrame
      title="Blast radius"
      description="How far a single compromise could spread"
      dataViz="blast-radius"
    >
      <div className="mb-3 text-lg font-semibold">
        {largest.length > 0
          ? `${largest.length} linked findings form an attack chain`
          : "No compounding attack chain detected"}
      </div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="muted text-xs uppercase tracking-wide">{s.label}</div>
            <div className="mt-0.5 text-2xl font-bold" style={{ color: worst ? severityColor(worst.severity) : "var(--ink)" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
      {worst && (
        <div className="border-t pt-3 text-sm leading-relaxed divide-line">
          <p>
            {worst.businessImpact} {largest.length > 1 ? `${largest.length - 1} further weaknesses compound this path — fixing the first link shrinks the entire chain.` : ""}
          </p>
          <p className="muted mt-2">
            <span className="text-xs font-semibold uppercase tracking-wide">Recommended first step · </span>
            {worst.remediationSummary}
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
