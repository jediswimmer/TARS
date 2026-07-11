"use client";

import { useMemo, useState } from "react";
import { TOPO_EXPOSURES, TOPO_IDENTITIES, TOPO_RESOURCES, TOPO_SUBSCRIPTION } from "../../lib/sample-viz";
import { buildTopology, type TopoNode } from "../../lib/viz-selectors";
import { ChartFrame } from "./ChartFrame";
import { DataTable } from "./DataTable";
import { Tooltip } from "./Tooltip";
import { useMeasure } from "./hooks";
import { ARROW_MARKER_ID, ARROW_MARKER_MUTUAL_ID, NODE_KIND_COLOR, severityColor, severityFill } from "./theme";
import { arcMidpoint, arcPath, useForceLayout, type LayoutNode } from "./useForceLayout";

const HEIGHT = 420;

type SimNode = LayoutNode<TopoNode>;

/** Visual radius per kind — also drives collision so labels never collide. */
function kindRadius(n: TopoNode): number {
  switch (n.kind) {
    case "internet":
    case "subscription":
      return 26;
    case "resource":
      return 20;
    case "identity":
      return 16;
  }
}

/** Pull both endpoints in along the chord so edges meet the node boundary, not its center. */
function trimEnds(a: SimNode, b: SimNode): [{ x: number; y: number }, { x: number; y: number }] {
  const x1 = a.x ?? 0, y1 = a.y ?? 0, x2 = b.x ?? 0, y2 = b.y ?? 0;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ra = kindRadius(a) + 3;
  const rb = kindRadius(b) + 7; // extra room for the arrowhead
  return [
    { x: x1 + (dx / len) * ra, y: y1 + (dy / len) * ra },
    { x: x2 - (dx / len) * rb, y: y2 - (dy / len) * rb },
  ];
}

/** The kind-specific mark. Shape (not just color) encodes kind. */
function NodeShape({ node, active }: { node: SimNode; active: boolean }) {
  const strokeW = active ? 3 : 2;
  switch (node.kind) {
    case "internet":
      return <circle r={24} fill="transparent" stroke={NODE_KIND_COLOR.internet} strokeWidth={strokeW} strokeDasharray="4 3" />;
    case "subscription":
      return <rect x={-30} y={-16} width={60} height={32} rx={8} fill={`color-mix(in srgb, ${NODE_KIND_COLOR.subscription} 12%, transparent)`} stroke={NODE_KIND_COLOR.subscription} strokeWidth={strokeW} />;
    case "resource": {
      const sev = node.findingSeverity;
      return (
        <g>
          {sev && <rect x={-24} y={-24} width={48} height={48} rx={12} fill="none" stroke={severityColor(sev)} strokeWidth={1.5} opacity={0.8} />}
          <rect
            x={-18}
            y={-18}
            width={36}
            height={36}
            rx={8}
            fill={sev ? severityFill(sev) : "var(--line)"}
            stroke={sev ? severityColor(sev) : "var(--muted)"}
            strokeWidth={strokeW}
          />
        </g>
      );
    }
    case "identity":
      return <rect x={-14} y={-14} width={28} height={28} rx={4} transform="rotate(45)" fill={`color-mix(in srgb, ${NODE_KIND_COLOR.identity} 18%, transparent)`} stroke={NODE_KIND_COLOR.identity} strokeWidth={strokeW} />;
  }
}

function nodeAriaLabel(n: TopoNode): string {
  const parts = [n.label, n.kind === "resource" ? `resource ${n.resourceType ?? ""}` : n.kind];
  if (n.findingSeverity) parts.push(`finding severity ${n.findingSeverity}`);
  return parts.join(", ");
}

/**
 * Tenant topology: how the internet reaches Contoso's resources (exposure
 * edges, labeled with port + source range) and which identities can act on the
 * subscription (role edges). Shape encodes node kind; a severity ring marks
 * resources carrying a finding. Technical roles only — same gate as the
 * attack-chain graph.
 */
export function TopologyMap() {
  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const [hovered, setHovered] = useState<SimNode | null>(null);

  const topo = useMemo(() => buildTopology(TOPO_SUBSCRIPTION, TOPO_RESOURCES, TOPO_IDENTITIES, TOPO_EXPOSURES), []);
  const collideRadius = useMemo(() => (n: TopoNode) => kindRadius(n) + 22, []);
  // 12 nodes in a half-width card: weaker repulsion + a strong centering pull,
  // or the outer nodes hit the safety clamp and stack in the corners.
  // Anchor the internet at the left edge so exposure edges get a horizontal run
  // (room for their port/source labels), and the subscription hub right-of-center
  // so identities orbit away from the exposure corridor.
  const layout = useForceLayout(topo.nodes, topo.links, {
    width,
    height: HEIGHT,
    distance: 75,
    charge: -260,
    xStrength: 0.16,
    yStrength: 0.22,
    collideRadius,
    pin: (n) =>
      n.kind === "internet"
        ? { x: 64, y: HEIGHT / 2 }
        : n.kind === "subscription"
          ? { x: Math.max(220, width * 0.62), y: HEIGHT / 2 }
          : undefined,
  });

  // The two internet→jumpbox exposures (3389, 22) overlap when straight; give
  // parallel edges between the same pair increasing arc offsets, and lift each
  // stacked label a step higher so the port/source text stays readable.
  const parallelIndex = useMemo(() => {
    const counts = new Map<string, number>();
    return (layout?.links ?? []).map((l) => {
      const key = `${l.source.id}→${l.target.id}`;
      const seen = counts.get(key) ?? 0;
      counts.set(key, seen + 1);
      return seen;
    });
  }, [layout]);

  // Parallel exposures share one visual corridor, so stacked per-edge labels
  // collide on short edges. Render ONE combined label per node pair instead:
  // "tcp/3389, tcp/22 · 0.0.0.0/0".
  const pairLabel = useMemo(() => {
    const byPair = new Map<string, string[]>();
    for (const l of topo.links) {
      if (l.kind !== "exposure" || !l.label) continue;
      const key = `${l.source}→${l.target}`;
      byPair.set(key, [...(byPair.get(key) ?? []), l.label]);
    }
    const combined = new Map<string, string>();
    for (const [key, labels] of byPair) {
      const suffix = labels[0]!.split(" · ")[1] ?? "";
      combined.set(key, `${labels.map((t) => t.split(" · ")[0]).join(", ")} · ${suffix}`);
    }
    return combined;
  }, [topo]);

  const labelById = useMemo(() => new Map(topo.nodes.map((n) => [n.id, n.label])), [topo]);

  const table = (
    <DataTable
      caption="Every edge in the tenant topology"
      columns={[
        { key: "from", label: "From" },
        { key: "kind", label: "Connection" },
        { key: "to", label: "To" },
        { key: "detail", label: "Detail" },
      ]}
      rows={topo.links.map((l) => ({
        from: labelById.get(l.source) ?? l.source,
        kind: l.kind === "exposure" ? "internet exposure" : "role assignment",
        to: labelById.get(l.target) ?? l.target,
        detail: l.label ?? "—",
      }))}
    />
  );

  return (
    <ChartFrame
      title="Tenant topology"
      description={`${topo.links.filter((l) => l.kind === "exposure").length} internet exposures · ${TOPO_IDENTITIES.length} privileged identities · ${TOPO_SUBSCRIPTION.id}`}
      dataViz="topology"
      table={table}
    >
      <div ref={containerRef} className="relative" style={{ height: HEIGHT }}>
        {!layout ? (
          <div className="muted flex h-full items-center justify-center text-xs" aria-hidden>
            Computing layout…
          </div>
        ) : (
          <svg width={width} height={HEIGHT} role="group" aria-label="Tenant topology map. Use Tab to move between nodes.">
            <defs>
              <marker id={`${ARROW_MARKER_ID}-topo`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted)" />
              </marker>
              <marker id={`${ARROW_MARKER_MUTUAL_ID}-topo`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-crit)" />
              </marker>
            </defs>

            {layout.links.map((l, i) => {
              const exposure = l.kind === "exposure";
              const para = parallelIndex[i] ?? 0;
              const offset = 10 + para * 22;
              const [from, to] = trimEnds(l.source, l.target);
              const mid = arcMidpoint(from, to, offset);
              return (
                <g key={i} aria-hidden>
                  <path
                    data-edge={l.kind}
                    d={arcPath(from, to, offset)}
                    fill="none"
                    stroke={exposure ? "var(--color-crit)" : "var(--muted)"}
                    strokeWidth={exposure ? 1.75 : 1.25}
                    strokeDasharray={exposure ? undefined : "4 3"}
                    opacity={exposure ? 0.8 : 0.55}
                    markerEnd={`url(#${exposure ? ARROW_MARKER_MUTUAL_ID : ARROW_MARKER_ID}-topo)`}
                  />
                  {/* Only exposure edges carry an on-canvas label — the port/source
                      pair IS the security story. Role names live in the data table
                      to keep 12 nodes' worth of canvas legible. One combined label
                      per node pair (rendered with its first edge). */}
                  {exposure && para === 0 && (
                    <text
                      data-edge-label={l.kind}
                      x={mid.x}
                      y={mid.y - 6}
                      textAnchor="middle"
                      className="select-none font-mono"
                      style={{ fontSize: 9, fill: "var(--color-crit)" }}
                    >
                      {pairLabel.get(`${l.source.id}→${l.target.id}`) ?? l.label}
                    </text>
                  )}
                </g>
              );
            })}

            {layout.nodes.map((n) => (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                tabIndex={0}
                role="img"
                aria-label={nodeAriaLabel(n)}
                className="outline-none"
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(n)}
                onBlur={() => setHovered(null)}
              >
                <NodeShape node={n} active={hovered?.id === n.id} />
                {/* Canvas labels stay short (identities show just the local part);
                    the full name is in the tooltip and the data table. */}
                <text textAnchor="middle" y={kindRadius(n) + 14} className="select-none" style={{ fontSize: 10, fill: "var(--muted)" }}>
                  {n.kind === "subscription" ? n.id : n.kind === "identity" ? n.label.split(" · ")[0]!.split("@")[0] : n.label.split(" · ")[0]}
                </text>
              </g>
            ))}
          </svg>
        )}

        {hovered && layout && (
          <Tooltip x={hovered.x ?? 0} y={hovered.y ?? 0} visible>
            <div className="font-semibold">{hovered.label}</div>
            <div className="muted mt-0.5">
              {hovered.kind}
              {hovered.resourceType ? ` · ${hovered.resourceType}` : ""}
              {hovered.findingSeverity ? ` · finding: ${hovered.findingSeverity}` : ""}
            </div>
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  );
}
