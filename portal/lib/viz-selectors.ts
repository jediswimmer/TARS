/**
 * Pure mappers: fleet-shaped reviews → viz graph shapes.
 * No React, no D3 — keep these unit-testable and SSR-safe.
 */
import type { FindingReview, Severity } from "@tars/contracts";
import type { FindingMeta } from "./sample-viz";

export interface ChainNode {
  id: string;
  title: string;
  severity: Severity;
  riskScore: number;
  category: string;
  resourceName: string;
  businessImpact: string;
  exploitability: string;
  remediationSummary: string;
}

export interface ChainLink {
  source: string;
  target: string;
  /** True when A↔B both listed each other — render opposing arcs. */
  mutual: boolean;
}

export interface AttackChainGraph {
  nodes: ChainNode[];
  links: ChainLink[];
  /** Connected components with length > 1 (feeds BlastRadiusCard). */
  chains: string[][];
}

export interface BlastRadiusSummary {
  chainCount: number;
  largestChainSize: number;
  findingsInChains: number;
  isolatedFindings: number;
  topSeverity: Severity | null;
  businessImpactBlurb: string;
  chainTitles: string[][];
  /** Ordered steps with severity for executive path diagrams. */
  chainSteps: { id: string; shortLabel: string; severity: Severity; riskScore: number }[][];
}

function undirectedKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Build attack-chain graph from validated non-FP reviews + finding meta. */
export function buildAttackChain(
  reviews: FindingReview[],
  meta: FindingMeta[],
): AttackChainGraph {
  const metaById = new Map(meta.map((m) => [m.id, m]));
  const accepted = reviews.filter((r) => r.validated && !r.falsePositive);
  const acceptedIds = new Set(accepted.map((r) => r.findingId));

  const nodes: ChainNode[] = accepted
    .map((r) => {
      const m = metaById.get(r.findingId);
      if (!m) return null;
      return {
        id: r.findingId,
        title: m.title,
        severity: m.severity,
        riskScore: r.riskScore,
        category: m.category,
        resourceName: m.resourceName,
        businessImpact: r.businessImpact,
        exploitability: r.exploitability,
        remediationSummary: r.remediation.summary,
      };
    })
    .filter((n): n is ChainNode => n !== null);

  // Collect directed edges between accepted findings, then collapse mutual pairs.
  const directed = new Set<string>();
  for (const r of accepted) {
    for (const other of r.correlatedFindingIds) {
      if (!acceptedIds.has(other) || other === r.findingId) continue;
      directed.add(`${r.findingId}>${other}`);
    }
  }

  const seenUndirected = new Map<string, ChainLink>();
  for (const edge of directed) {
    const [source, target] = edge.split(">") as [string, string];
    const key = undirectedKey(source, target);
    const reverse = `${target}>${source}`;
    const mutual = directed.has(reverse);
    if (!seenUndirected.has(key)) {
      // Canonical orientation: lexicographically smaller id as source when mutual.
      const [a, b] = source < target ? [source, target] : [target, source];
      seenUndirected.set(key, {
        source: mutual ? a : source,
        target: mutual ? b : target,
        mutual,
      });
    }
  }
  const links = [...seenUndirected.values()];

  // Connected components (undirected).
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const l of links) {
    adj.get(l.source)?.add(l.target);
    adj.get(l.target)?.add(l.source);
  }
  const visited = new Set<string>();
  const chains: string[][] = [];
  for (const n of nodes) {
    if (visited.has(n.id)) continue;
    const stack = [n.id];
    const comp: string[] = [];
    visited.add(n.id);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const next of adj.get(cur) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }
    if (comp.length > 1) chains.push(comp);
  }

  return { nodes, links, chains };
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/** Aggregate blast-radius copy for the executive (non-graph) view. */
export function summarizeBlastRadius(graph: AttackChainGraph): BlastRadiusSummary {
  const inChain = new Set(graph.chains.flat());
  const findingsInChains = inChain.size;
  const isolatedFindings = graph.nodes.length - findingsInChains;
  const largestChainSize = graph.chains.reduce((m, c) => Math.max(m, c.length), 0);

  let topSeverity: Severity | null = null;
  for (const n of graph.nodes) {
    if (!inChain.has(n.id)) continue;
    if (!topSeverity || SEVERITY_RANK[n.severity] > SEVERITY_RANK[topSeverity]) {
      topSeverity = n.severity;
    }
  }

  const titleById = new Map(graph.nodes.map((n) => [n.id, n.title]));
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  // Order each chain for display: start at highest riskScore, then BFS along edges.
  const adj = new Map<string, Set<string>>();
  for (const n of graph.nodes) adj.set(n.id, new Set());
  for (const l of graph.links) {
    adj.get(l.source)?.add(l.target);
    adj.get(l.target)?.add(l.source);
  }

  const orderedChains = graph.chains.map((comp) => orderChainForDisplay(comp, nodeById, adj));

  const chainTitles = orderedChains.map((c) => c.map((id) => titleById.get(id) ?? id));
  const chainSteps = orderedChains.map((c) =>
    c.map((id) => {
      const n = nodeById.get(id)!;
      return {
        id,
        shortLabel: shortFindingLabel(n.title, n.resourceName),
        severity: n.severity,
        riskScore: n.riskScore,
      };
    }),
  );

  const criticalInChain = graph.nodes.filter(
    (n) => inChain.has(n.id) && n.severity === "critical",
  ).length;

  const businessImpactBlurb =
    graph.chains.length === 0
      ? "No correlated compromise paths were validated in this scan. Findings stand alone."
      : `${graph.chains.length} live compromise path${graph.chains.length === 1 ? "" : "s"} link${graph.chains.length === 1 ? "s" : ""} ${findingsInChains} findings` +
        (criticalInChain
          ? `, including ${criticalInChain} critical. Breaking any link collapses the chain.`
          : ". Breaking any link collapses the chain.");

  return {
    chainCount: graph.chains.length,
    largestChainSize,
    findingsInChains,
    isolatedFindings,
    topSeverity,
    businessImpactBlurb,
    chainTitles,
    chainSteps,
  };
}

/** Short executive label — resource or truncated title, no exploit jargon. */
function shortFindingLabel(title: string, resourceName: string): string {
  if (resourceName) {
    // Keep emails intact; the path card wraps unbroken tokens.
    if (resourceName.length <= 24 || resourceName.includes("@")) return resourceName;
    return `${resourceName.slice(0, 22)}…`;
  }
  return title.length > 24 ? `${title.slice(0, 22)}…` : title;
}

/** BFS from the highest-risk node so the path reads epicenter → periphery. */
function orderChainForDisplay(
  comp: string[],
  nodeById: Map<string, ChainNode>,
  adj: Map<string, Set<string>>,
): string[] {
  const start = [...comp].sort(
    (a, b) => (nodeById.get(b)?.riskScore ?? 0) - (nodeById.get(a)?.riskScore ?? 0),
  )[0]!;
  const compSet = new Set(comp);
  const ordered: string[] = [];
  const seen = new Set<string>();
  const queue = [start];
  seen.add(start);
  while (queue.length) {
    const cur = queue.shift()!;
    ordered.push(cur);
    const neighbors = [...(adj.get(cur) ?? [])]
      .filter((id) => compSet.has(id) && !seen.has(id))
      .sort((a, b) => (nodeById.get(b)?.riskScore ?? 0) - (nodeById.get(a)?.riskScore ?? 0));
    for (const n of neighbors) {
      seen.add(n);
      queue.push(n);
    }
  }
  return ordered;
}
