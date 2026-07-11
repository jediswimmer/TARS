/**
 * Query strings and low-level helpers for `LiveAzureConnector`. Kept separate
 * from `client.ts` so the connector reads as "fetch → map → snapshot" while the
 * KQL, pagination, and graceful-degradation plumbing lives here.
 */
import type { ResourceGraphClient } from "@azure/arm-resourcegraph";
import type { Client, GraphRequest } from "@microsoft/microsoft-graph-client";

// ---------------------------------------------------------------------------
// Azure Resource Graph (KQL). Resource Graph speaks a Kusto subset over the
// ARM control plane, so one query fans out across every subscription in scope.
// ---------------------------------------------------------------------------

/**
 * All resources in scope with their flattened `properties` bag (the
 * security-relevant config surface). `order by id` makes the result
 * deterministic so recorded snapshots replay byte-for-byte.
 */
export const RESOURCES_KQL = `
resources
| project id, type, name, location, resourceGroup, subscriptionId, tags, properties
| order by id asc
`.trim();

/** Human-readable subscription display names (the `resources` table only has ids). */
export const SUBSCRIPTIONS_KQL = `
resourcecontainers
| where type =~ 'microsoft.resources/subscriptions'
| project subscriptionId, name
`.trim();

/**
 * Internet-facing inbound allow rules distilled from NSGs: expand each NSG's
 * securityRules, keep inbound `Allow` rules whose source is a wildcard
 * (`*` / `0.0.0.0/0` / `Internet`), in either the single-prefix or list form.
 */
export const NSG_EXPOSURES_KQL = `
resources
| where type =~ 'microsoft.network/networkSecurityGroups'
| mv-expand rule = properties.securityRules
| extend p = rule.properties
| where tostring(p.direction) =~ 'Inbound' and tostring(p.access) =~ 'Allow'
| extend srcPrefix = tostring(p.sourceAddressPrefix)
| extend srcPrefixes = p.sourceAddressPrefixes
| where srcPrefix in~ ('*', '0.0.0.0/0', 'internet')
    or srcPrefixes has_any ('*', '0.0.0.0/0', 'Internet')
| project nsgId = id,
          nsgName = name,
          ruleName = tostring(rule.name),
          protocol = tostring(p.protocol),
          port = tostring(p.destinationPortRange),
          ports = p.destinationPortRanges,
          source = iff(srcPrefix != '', srcPrefix, tostring(srcPrefixes))
| order by nsgId asc, ruleName asc
`.trim();

// ---------------------------------------------------------------------------
// Row shapes projected by the KQL above. Resource Graph returns loosely typed
// JObject arrays, so we assert these narrow shapes at the query boundary.
// ---------------------------------------------------------------------------

export interface ResourceRow {
  id: string;
  type: string;
  name: string;
  location: string;
  resourceGroup: string | null;
  subscriptionId: string;
  tags: Record<string, string> | null;
  properties: unknown;
}

export interface NsgExposureRow {
  nsgId: string;
  nsgName: string;
  ruleName: string;
  protocol: string;
  /** Single destination port range, e.g. "22", "*", "8000-8080". */
  port: string;
  /** Optional list form (`destinationPortRanges`); present when the rule lists many. */
  ports: unknown;
  source: string;
}

export interface SubscriptionRow {
  subscriptionId: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Pagination + degradation helpers.
// ---------------------------------------------------------------------------

/**
 * Run a Resource Graph query to completion, following the `$skipToken`
 * continuation until every page is drained. Default result format is
 * `objectArray`, so `res.data` is an array of row objects.
 */
export async function runResourceGraphQuery<T>(
  rg: ResourceGraphClient,
  subscriptions: string[],
  query: string,
): Promise<T[]> {
  const rows: T[] = [];
  let skipToken: string | undefined;
  do {
    const res = await rg.resources({
      subscriptions,
      query,
      options: skipToken ? { skipToken } : undefined,
    });
    const data: unknown = res.data;
    if (Array.isArray(data)) rows.push(...(data as T[]));
    skipToken = res.skipToken;
  } while (skipToken);
  return rows;
}

/** A single page of a Microsoft Graph collection response. */
interface GraphPage<T> {
  value?: T[];
  "@odata.nextLink"?: string;
}

/**
 * Drain a Microsoft Graph collection, following `@odata.nextLink`. The next
 * link is an absolute URL that already encodes `$select`/`$filter`, so we replay
 * it verbatim through `graph.api(next)`.
 */
export async function pageAll<T>(graph: Client, request: GraphRequest): Promise<T[]> {
  const items: T[] = [];
  let page = (await request.get()) as GraphPage<T>;
  for (;;) {
    if (Array.isArray(page.value)) items.push(...page.value);
    const next = page["@odata.nextLink"];
    if (!next) break;
    page = (await graph.api(next).get()) as GraphPage<T>;
  }
  return items;
}

/** Log that an optional data source was skipped, without failing the capture. */
export function warn(label: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.warn(`[LiveAzureConnector] ${label} unavailable; continuing without it: ${message}`);
}

/**
 * Run an optional step, returning `fallback` (and warning) if it throws. Used
 * for signals that a least-privilege SP may lack (MFA report, Defender, etc.)
 * so a missing permission degrades one field instead of the whole snapshot.
 */
export async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    warn(label, err);
    return fallback;
  }
}

/**
 * Normalize NSG port(s) into the snapshot's `number | string` form, expanding
 * the `destinationPortRanges` list when present. Numeric ports become numbers;
 * ranges/wildcards stay strings. Empty input falls back to `"*"` (all ports).
 */
export function normalizePorts(port: string, ports: unknown): (number | string)[] {
  const raw =
    Array.isArray(ports) && ports.length > 0 ? ports.map((p) => String(p)) : [port];
  const cleaned = raw.map((p) => p.trim()).filter((p) => p.length > 0);
  const list = cleaned.length > 0 ? cleaned : ["*"];
  return list.map((p) => (/^\d+$/.test(p) ? Number(p) : p));
}
