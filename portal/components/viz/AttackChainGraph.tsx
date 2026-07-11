"use client";

import { useMemo, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { SEVERITY_COLOR } from "../../lib/sample";
import { VIZ_FINDINGS } from "../../lib/sample-viz";
import { buildAttackChain, type ChainNode } from "../../lib/viz-selectors";
import { ChartFrame } from "./ChartFrame";
import { DataTable } from "./DataTable";
import { Tooltip } from "./Tooltip";
import { useMeasure, useMounted } from "./hooks";
import { ARROW_MARKER_ID, ARROW_MARKER_MUTUAL_ID, makeRiskRadius, severityColor, severityFill } from "./theme";

const HEIGHT = 380;
const PAD_X = 60;
const PAD_TOP = 40;
const PAD_BOTTOM = 56; // room for the resource label under the circle

type SimNode = ChainNode & SimulationNodeDatum;
interface SimLink extends SimulationLinkDatum<SimNode> {
  mutual: boolean;
}

interface Layout {
  nodes: SimNode[];
  links: { source: SimNode; target: SimNode; mutual: boolean }[];
}

/**
 * Deterministic force layout: d3-force initializes nodes in a phyllotaxis
 * arrangement (no randomness), so a synchronous 300-tick always converges to
 * the same picture for the same data + width. Runs client-side only (guarded
 * by useMounted in the component) — never during SSR.
 */
function computeLayout(width: number, radius: (n: number) => number): Layout {
  const chain = buildAttackChain(VIZ_FINDINGS);
  const nodes: SimNode[] = chain.nodes.map((n) => ({ ...n }));
  const links: SimLink[] = chain.links.map((l) => ({ ...l }));

  // forceX/forceY pull strays back toward the middle DURING the simulation, so
  // the final safety clamp below almost never fires — clamping after the fact
  // would stack escaped nodes on top of each other at the frame edge.
  forceSimulation(nodes)
    .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(95))
    .force("charge", forceManyBody().strength(-300))
    .force("center", forceCenter(width / 2, HEIGHT / 2))
    .force("x", forceX(width / 2).strength(0.06))
    .force("y", forceY(HEIGHT / 2).strength(0.14))
    .force("collide", forceCollide<SimNode>((d) => radius(d.riskScore) + 18))
    .stop()
    .tick(300);

  for (const n of nodes) {
    n.x = Math.max(PAD_X, Math.min(width - PAD_X, n.x ?? width / 2));
    n.y = Math.max(PAD_TOP, Math.min(HEIGHT - PAD_BOTTOM, n.y ?? HEIGHT / 2));
  }

  // After the simulation, forceLink has resolved source/target to node objects.
  return { nodes, links: links.map((l) => ({ source: l.source as SimNode, target: l.target as SimNode, mutual: l.mutual })) };
}

/** Quadratic arc between two points, bowed perpendicular by `offset` px. */
function arcPath(a: SimNode, b: SimNode, offset: number): string {
  const x1 = a.x!, y1 = a.y!, x2 = b.x!, y2 = b.y!;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * offset;
  const cy = my + (dx / len) * offset;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function Pill({ severity }: { severity: ChainNode["severity"] }) {
  return (
    <span className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: SEVERITY_COLOR[severity] }}>
      {severity}
    </span>
  );
}

/**
 * Force-directed attack-chain graph over the reviewed findings. Node size is
 * risk score (area-proportional); reciprocal correlations render as opposing
 * curved arcs — "these two compound each other". Technical roles only; the
 * executive/auditor equivalent is BlastRadiusCard.
 */
export function AttackChainGraph() {
  const mounted = useMounted();
  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const [hovered, setHovered] = useState<SimNode | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const chain = useMemo(() => buildAttackChain(VIZ_FINDINGS), []);
  const inChain = useMemo(() => new Set(chain.chains.flat()), [chain]);
  const radius = useMemo(() => makeRiskRadius(), []);
  const layout = useMemo(
    () => (mounted && width > 0 ? computeLayout(width, radius) : null),
    [mounted, width, radius],
  );

  const pinned = layout?.nodes.find((n) => n.id === pinnedId) ?? null;
  const titleById = useMemo(() => new Map(chain.nodes.map((n) => [n.id, n.resourceName])), [chain]);

  const table = (
    <DataTable
      caption="Validated findings and their correlations"
      columns={[
        { key: "title", label: "Finding" },
        { key: "severity", label: "Severity" },
        { key: "risk", label: "Risk" },
        { key: "resource", label: "Resource" },
        { key: "linked", label: "Linked to" },
      ]}
      rows={chain.nodes.map((n) => ({
        title: n.title,
        severity: n.severity,
        risk: n.riskScore,
        resource: n.resourceName,
        linked:
          chain.links
            .filter((l) => l.source === n.id || l.target === n.id)
            .map((l) => titleById.get(l.source === n.id ? l.target : l.source))
            .join(", ") || "—",
      }))}
    />
  );

  return (
    <ChartFrame
      title="Attack chain"
      description={`${chain.nodes.length} validated findings — ${Math.max(0, ...chain.chains.map((c) => c.length))} compound into an attack path, ${chain.nodes.length - chain.chains.flat().length} standalone`}
      dataViz="attack-chain"
      table={table}
    >
      <div
        ref={containerRef}
        className="relative"
        style={{ height: HEIGHT }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setPinnedId(null);
        }}
      >
        {!layout ? (
          <div className="muted flex h-full items-center justify-center text-xs" aria-hidden>
            Computing layout…
          </div>
        ) : (
          <svg width={width} height={HEIGHT} role="group" aria-label="Attack-chain graph. Use Tab to move between findings, Enter to pin details, Escape to clear.">
            <defs>
              <marker id={ARROW_MARKER_ID} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
              </marker>
              <marker id={ARROW_MARKER_MUTUAL_ID} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-crit)" />
              </marker>
            </defs>

            {layout.links.map((l, i) =>
              l.mutual ? (
                // Reciprocal correlation: two opposing arcs, arrowhead each way.
                <g key={i} aria-hidden>
                  <path d={arcPath(l.source, l.target, 14)} fill="none" stroke="var(--color-crit)" strokeWidth={1.5} opacity={0.7} markerEnd={`url(#${ARROW_MARKER_MUTUAL_ID})`} />
                  <path d={arcPath(l.target, l.source, 14)} fill="none" stroke="var(--color-crit)" strokeWidth={1.5} opacity={0.7} markerEnd={`url(#${ARROW_MARKER_MUTUAL_ID})`} />
                </g>
              ) : (
                <path key={i} aria-hidden d={arcPath(l.source, l.target, 0)} fill="none" stroke="var(--muted)" strokeWidth={1.25} opacity={0.6} markerEnd={`url(#${ARROW_MARKER_ID})`} />
              ),
            )}

            {layout.nodes.map((n) => {
              const r = radius(n.riskScore);
              const active = pinnedId === n.id || hovered?.id === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${n.title}, severity ${n.severity}, risk ${n.riskScore} of 100`}
                  aria-pressed={pinnedId === n.id}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(n)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setPinnedId((cur) => (cur === n.id ? null : n.id))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPinnedId((cur) => (cur === n.id ? null : n.id));
                    }
                  }}
                >
                  {inChain.has(n.id) && (
                    <circle r={r + 5} fill="none" stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
                  )}
                  <circle
                    r={r}
                    fill={severityFill(n.severity)}
                    stroke={severityColor(n.severity)}
                    strokeWidth={active ? 3 : 2}
                  />
                  <text textAnchor="middle" dy="0.35em" className="select-none font-mono" style={{ fontSize: 11, fontWeight: 700, fill: "var(--ink)" }}>
                    {n.riskScore}
                  </text>
                  <text textAnchor="middle" y={r + 16} className="select-none" style={{ fontSize: 10, fill: "var(--muted)" }}>
                    {n.resourceName}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {hovered && layout && !pinned && (
          <Tooltip x={hovered.x ?? 0} y={hovered.y ?? 0} visible>
            <div className="font-semibold">{hovered.title}</div>
            <div className="muted mt-0.5">
              {hovered.severity} · risk {hovered.riskScore}/100 · {hovered.resourceName}
            </div>
          </Tooltip>
        )}
      </div>

      {pinned && (
        <div data-viz="attack-chain-detail" className="mt-3 rounded-lg border p-3 text-sm divide-line">
          <div className="mb-2 flex items-center gap-2">
            <Pill severity={pinned.severity} />
            <span className="font-semibold">{pinned.title}</span>
            <span className="muted ml-auto font-mono text-xs">risk {pinned.riskScore}/100</span>
          </div>
          <dl className="grid gap-1.5">
            <div>
              <dt className="muted inline text-xs uppercase tracking-wide">Business impact · </dt>
              <dd className="inline">{pinned.businessImpact}</dd>
            </div>
            <div>
              <dt className="muted inline text-xs uppercase tracking-wide">Exploitability · </dt>
              <dd className="inline">{pinned.exploitability}</dd>
            </div>
            <div>
              <dt className="muted inline text-xs uppercase tracking-wide">Remediation · </dt>
              <dd className="inline">{pinned.remediationSummary}</dd>
            </div>
          </dl>
        </div>
      )}
    </ChartFrame>
  );
}
