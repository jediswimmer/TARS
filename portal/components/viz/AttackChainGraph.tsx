"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from "d3-force";
import type { Severity } from "@tars/contracts";
import type { ChainLink, ChainNode } from "../../lib/viz-selectors";
import { SEVERITY_COLOR, SEVERITY_TEXT_COLOR } from "../../lib/sample";
import { ChartFrame } from "./ChartFrame";
import { useMeasure, useMounted } from "./hooks";
import { ARROW_MARKER_ID, ArrowMarkerDefs, riskRadiusScale, severityFill, severityStroke } from "./theme";
import { VizTooltip } from "./Tooltip";

interface SimNode extends SimulationNodeDatum, ChainNode {
  x: number;
  y: number;
}

interface AttackChainGraphProps {
  nodes: ChainNode[];
  links: ChainLink[];
}

const MIN_H = 460;
const LABEL_PAD = 36;

function shortLabel(n: ChainNode): string {
  const s = n.resourceName || n.title;
  return s.length > 16 ? `${s.slice(0, 14)}…` : s;
}

function linkPath(
  source: SimNode,
  target: SimNode,
  mutual: boolean,
  lane: 0 | 1,
): string {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.hypot(dx, dy) || 1;
  const rScale = riskRadiusScale(12, 26);
  const startPad = rScale(source.riskScore) + 2;
  const endPad = rScale(target.riskScore) + 8;
  const sx = source.x + (dx / dist) * startPad;
  const sy = source.y + (dy / dist) * startPad;
  const tx = target.x - (dx / dist) * endPad;
  const ty = target.y - (dy / dist) * endPad;

  if (!mutual) return `M${sx},${sy} L${tx},${ty}`;

  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const nx = -dy / dist;
  const ny = dx / dist;
  const bulge = 22 * (lane === 0 ? 1 : -1);
  return `M${sx},${sy} Q${mx + nx * bulge},${my + ny * bulge} ${tx},${ty}`;
}

function linkStroke(source: ChainNode, target: ChainNode): string {
  const rank: Record<Severity, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };
  const top = rank[source.severity] >= rank[target.severity] ? source.severity : target.severity;
  return SEVERITY_COLOR[top];
}

function isNeighbor(a: string, b: string, links: ChainLink[]): boolean {
  return links.some(
    (l) =>
      (l.source === a && l.target === b) ||
      (l.target === a && l.source === b),
  );
}

/**
 * Live SVG force layout — stage fills the card edge-to-edge via CSS grid/glow,
 * not a fixed-size artwork block. Nodes/links recompute to measured size.
 */
export function AttackChainGraph({ nodes, links }: AttackChainGraphProps) {
  const mounted = useMounted();
  const noiseId = useId().replace(/:/g, "");
  const stageRef = useRef<HTMLDivElement>(null);
  const { width: measuredW, height: measuredH } = useMeasure(stageRef);
  const width = Math.max(measuredW, 320);
  const height = Math.max(measuredH, MIN_H);

  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPinnedId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const layout = useMemo(() => {
    if (!mounted || nodes.length === 0 || width < 40) return null;

    const simNodes: SimNode[] = nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      return {
        ...n,
        x: width / 2 + Math.cos(angle) * Math.min(width, height) * 0.22,
        y: height / 2 + Math.sin(angle) * Math.min(width, height) * 0.18,
      };
    });
    const byId = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks = links.map((l) => ({
      ...l,
      source: byId.get(l.source)!,
      target: byId.get(l.target)!,
    }));

    const rScale = riskRadiusScale(12, 26);
    const sim = forceSimulation(simNodes)
      .force(
        "link",
        forceLink(simLinks)
          .id((d) => (d as SimNode).id)
          .distance(Math.max(100, Math.min(width, height) * 0.22))
          .strength(0.65),
      )
      .force("charge", forceManyBody().strength(-Math.max(220, width * 0.45)))
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius((d) => rScale(d.riskScore) + 18)
          .strength(0.95),
      )
      .stop();

    for (let i = 0; i < 320; i++) sim.tick();

    for (const n of simNodes) {
      const r = rScale(n.riskScore);
      n.x = Math.min(width - r - 20, Math.max(r + 20, n.x));
      n.y = Math.min(height - r - LABEL_PAD - 8, Math.max(r + 36, n.y));
    }

    return { simNodes, simLinks };
  }, [mounted, nodes, links, width, height]);

  const activeId = pinnedId ?? hoverId;
  const activeNode = nodes.find((n) => n.id === activeId) ?? null;
  const activeLayout = layout?.simNodes.find((n) => n.id === activeId);

  const linkedIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of links) {
      s.add(l.source);
      s.add(l.target);
    }
    return s;
  }, [links]);

  const tableColumns = [
    { key: "title", header: "Finding", cell: (r: ChainNode) => r.title },
    { key: "severity", header: "Severity", cell: (r: ChainNode) => r.severity },
    { key: "risk", header: "Risk", cell: (r: ChainNode) => String(r.riskScore) },
    { key: "resource", header: "Resource", cell: (r: ChainNode) => r.resourceName },
  ];

  return (
    <ChartFrame
      title="Threat surface · attack chain"
      description="Validated correlations between findings. Mutual links are bidirectional."
      dataViz="attack-chain"
      tableColumns={tableColumns}
      tableRows={nodes}
      bleed
    >
      <div className="flex min-h-[460px] flex-col">
        <div
          ref={stageRef}
          className="viz-stage relative min-h-[460px] flex-1 overflow-hidden"
        >
          {/* Film grain — tiled SVG noise, not a fixed bitmap plate */}
          <svg
            aria-hidden
            className="viz-stage-grain"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
          >
            <defs>
              <filter
                id={noiseId}
                x="0%"
                y="0%"
                width="100%"
                height="100%"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.9"
                  numOctaves="3"
                  stitchTiles="stitch"
                  result="noise"
                />
                <feColorMatrix
                  in="noise"
                  type="matrix"
                  values="0 0 0 0 0.5
                          0 0 0 0 0.5
                          0 0 0 0 0.5
                          0 0 0 0.55 0"
                />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
          </svg>

          <span className="telemetry pointer-events-none absolute top-3 left-4 z-10 text-[10px] font-semibold tracking-[0.1em] text-(--muted)">
            THREAT SURFACE · FORCE LAYOUT
          </span>
          <span className="telemetry pointer-events-none absolute top-3 right-4 z-10 text-[10px] tracking-[0.08em] text-(--muted)">
            CONTOSO · PROD
          </span>

          {!layout ? (
            <div className="flex h-full min-h-[460px] items-center justify-center text-sm text-(--muted)">
              Computing layout…
            </div>
          ) : (
            <svg
              width={width}
              height={height}
              className="absolute inset-0 block h-full w-full"
              role="group"
              aria-label="Attack chain force graph"
            >
              <ArrowMarkerDefs color="var(--muted)" />

              {layout.simLinks.map((l, i) => {
                const source = l.source as SimNode;
                const target = l.target as SimNode;
                const stroke = linkStroke(source, target);
                const paths = l.mutual
                  ? [linkPath(source, target, true, 0), linkPath(target, source, true, 1)]
                  : [linkPath(source, target, false, 0)];
                return (
                  <g key={`${source.id}-${target.id}-${i}`}>
                    {paths.map((d, pi) => (
                      <path
                        key={`glow-${pi}`}
                        d={d}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={6}
                        opacity={0.12}
                        strokeLinecap="round"
                      />
                    ))}
                    {paths.map((d, pi) => (
                      <path
                        key={`line-${pi}`}
                        d={d}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={1.75}
                        opacity={0.75}
                        markerEnd={`url(#${ARROW_MARKER_ID})`}
                      />
                    ))}
                  </g>
                );
              })}

              {layout.simNodes.map((n) => {
                const r = riskRadiusScale(12, 26)(n.riskScore);
                const selected = activeId === n.id;
                const inChain = linkedIds.has(n.id);
                const dimmed = Boolean(
                  activeId && activeId !== n.id && !isNeighbor(n.id, activeId, links),
                );
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    tabIndex={0}
                    role="button"
                    aria-pressed={pinnedId === n.id}
                    aria-label={`${n.title}, ${n.severity}, risk ${n.riskScore}`}
                    opacity={dimmed ? 0.35 : 1}
                    className="cursor-pointer outline-none focus-visible:[&_circle]:stroke-(--accent) focus-visible:[&_circle]:stroke-[2.5]"
                    onMouseEnter={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => setPinnedId((prev) => (prev === n.id ? null : n.id))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPinnedId((prev) => (prev === n.id ? null : n.id));
                      }
                    }}
                  >
                    {n.severity === "critical" ? (
                      <circle
                        r={r + 6}
                        fill="none"
                        stroke={SEVERITY_COLOR.critical}
                        strokeWidth={1}
                        opacity={0.4}
                        strokeDasharray="2 3"
                      />
                    ) : null}
                    <circle r={r + 1} fill="var(--ink)" opacity={0.06} cy={1.5} />
                    <circle
                      r={r}
                      fill={severityFill(n.severity)}
                      stroke={severityStroke(n.severity)}
                      strokeWidth={selected ? 2.75 : inChain ? 2 : 1.5}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      className="telemetry"
                      style={{
                        fill: SEVERITY_TEXT_COLOR[n.severity],
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {n.riskScore}
                    </text>
                    <text
                      textAnchor="middle"
                      y={r + 14}
                      className="telemetry"
                      style={{ fill: "var(--ink)", fontSize: 10, fontWeight: 600 }}
                    >
                      {shortLabel(n)}
                    </text>
                    <text
                      textAnchor="middle"
                      y={r + 26}
                      style={{
                        fill: "var(--muted)",
                        fontSize: 9,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {n.severity}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {activeNode && activeLayout && measuredW > 0 ? (
            <VizTooltip
              x={activeLayout.x}
              y={activeLayout.y}
              visible
              containerRef={stageRef}
            >
              <div className="font-semibold">{activeNode.title}</div>
              <div className="mt-1 text-(--muted)">
                <span className="capitalize">{activeNode.severity}</span>
                {" · "}
                <span className="telemetry">{activeNode.resourceName}</span>
              </div>
              <p className="mt-2 text-[12px] leading-snug">{activeNode.businessImpact}</p>
              <p className="mt-1 text-[12px] text-(--muted)">{activeNode.remediationSummary}</p>
              {pinnedId ? (
                <p className="telemetry mt-2 text-[10px] text-(--muted)">Pinned · Esc to clear</p>
              ) : null}
            </VizTooltip>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-(--line) bg-(--panel) px-4 py-2.5">
          <span className="telemetry text-[10px] tracking-[0.06em] text-(--muted) uppercase">
            Legend
          </span>
          {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[12px] text-(--ink)">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{
                  background: `color-mix(in srgb, ${SEVERITY_COLOR[s]} 35%, transparent)`,
                  boxShadow: `inset 0 0 0 1.5px ${SEVERITY_COLOR[s]}`,
                }}
              />
              <span className="capitalize">{s}</span>
            </span>
          ))}
          <span className="ml-auto text-[12px] text-(--muted)">
            Node size ∝ risk · dashed halo = critical · click to pin
          </span>
        </div>
      </div>
    </ChartFrame>
  );
}
