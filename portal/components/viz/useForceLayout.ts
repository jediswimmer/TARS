"use client";

import { useMemo } from "react";
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
import { useMounted } from "./hooks";

export interface ForceLayoutOptions<N> {
  width: number;
  height: number;
  /** Target link length in px. */
  distance?: number;
  /** Many-body repulsion strength (negative = repel). */
  charge?: number;
  /** Per-node collision radius — set it to visual radius + label breathing room. */
  collideRadius: (n: N) => number;
  /** Horizontal/vertical centering pull. Raise for dense graphs in narrow frames. */
  xStrength?: number;
  yStrength?: number;
  /** Fix chosen nodes in place (d3 fx/fy) — e.g. anchor an "internet" node at the frame edge. */
  pin?: (n: N) => { x: number; y: number } | undefined;
  padX?: number;
  padTop?: number;
  /** Extra bottom padding for the label rendered under each node. */
  padBottom?: number;
}

export type LayoutNode<N> = N & SimulationNodeDatum;

export interface ForceLayout<N, L> {
  nodes: LayoutNode<N>[];
  links: (Omit<L, "source" | "target"> & { source: LayoutNode<N>; target: LayoutNode<N> })[];
}

/**
 * Deterministic force layout shared by every graph chart: d3-force initializes
 * nodes in a phyllotaxis arrangement (no randomness), so a synchronous 300-tick
 * always converges to the same picture for the same data + width. forceX/forceY
 * pull strays back toward the middle DURING the simulation, so the final safety
 * clamp almost never fires — clamping after the fact would stack escaped nodes
 * on top of each other at the frame edge. Returns null until mounted with a
 * measured width (SSR renders the caller's skeleton — never the simulation).
 */
export function useForceLayout<N extends { id: string }, L extends { source: string; target: string }>(
  inputNodes: N[],
  inputLinks: L[],
  opts: ForceLayoutOptions<N>,
): ForceLayout<N, L> | null {
  const mounted = useMounted();
  const { width, height, distance = 95, charge = -300, collideRadius, pin, xStrength = 0.06, yStrength = 0.14, padX = 60, padTop = 40, padBottom = 56 } = opts;

  return useMemo(() => {
    if (!mounted || width <= 0) return null;

    type SimNode = LayoutNode<N>;
    type SimLink = SimulationLinkDatum<SimNode> & Omit<L, "source" | "target">;
    const nodes: SimNode[] = inputNodes.map((n) => {
      const copy: SimNode = { ...n };
      const fixed = pin?.(n);
      if (fixed) {
        copy.fx = fixed.x;
        copy.fy = fixed.y;
      }
      return copy;
    });
    const links: SimLink[] = inputLinks.map((l) => ({ ...l }));

    forceSimulation(nodes)
      .force("link", forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(distance))
      .force("charge", forceManyBody().strength(charge))
      .force("center", forceCenter(width / 2, height / 2))
      .force("x", forceX(width / 2).strength(xStrength))
      .force("y", forceY(height / 2).strength(yStrength))
      .force("collide", forceCollide<SimNode>((d) => collideRadius(d)))
      .stop()
      .tick(300);

    for (const n of nodes) {
      n.x = Math.max(padX, Math.min(width - padX, n.x ?? width / 2));
      n.y = Math.max(padTop, Math.min(height - padBottom, n.y ?? height / 2));
    }

    // After the simulation, forceLink has resolved source/target to node objects.
    return {
      nodes,
      links: links.map((l) => ({ ...l, source: l.source as SimNode, target: l.target as SimNode })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- collideRadius is intentionally
    // captured by value; callers pass stable or memoized functions.
  }, [mounted, width, height, distance, charge, xStrength, yStrength, padX, padTop, padBottom, inputNodes, inputLinks]);
}

/** Quadratic arc between two positioned nodes, bowed perpendicular by `offset` px (0 = straight). */
export function arcPath(
  a: { x?: number; y?: number },
  b: { x?: number; y?: number },
  offset: number,
): string {
  const x1 = a.x ?? 0, y1 = a.y ?? 0, x2 = b.x ?? 0, y2 = b.y ?? 0;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * offset;
  const cy = my + (dx / len) * offset;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

/** Midpoint of the quadratic arc produced by `arcPath` (t = 0.5) — where edge labels sit. */
export function arcMidpoint(
  a: { x?: number; y?: number },
  b: { x?: number; y?: number },
  offset: number,
): { x: number; y: number } {
  const x1 = a.x ?? 0, y1 = a.y ?? 0, x2 = b.x ?? 0, y2 = b.y ?? 0;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Quadratic Bézier at t=0.5 sits halfway between the chord midpoint and the control point.
  return { x: mx + (-dy / len) * (offset / 2), y: my + (dx / len) * (offset / 2) };
}
