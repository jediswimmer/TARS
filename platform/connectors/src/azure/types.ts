import { z } from "zod";

/**
 * A normalized, provider-agnostic snapshot of an Azure environment. The scanner
 * agent reasons over THIS, not raw ARM responses — which means (a) every LLM
 * sees byte-identical input, and (b) we can record/replay real tenants as
 * fixtures for offline runs and regression tests.
 *
 * The shape is defined as a Zod schema so a recorded fixture can be validated on
 * read (a malformed snapshot fails loudly with a path, not `undefined` deep in
 * the scanner) and so `snapshotVersion` gives us a migration handle as the Azure
 * facet deepens. Types are `z.infer`red from the schemas, so downstream code is
 * unchanged — the interfaces simply became schemas.
 */

/** Schema version — bump when the snapshot shape changes in a breaking way. */
export const SNAPSHOT_VERSION = "1.0.0";

export const AzureSubscriptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  resourceCount: z.number(),
});
export type AzureSubscription = z.infer<typeof AzureSubscriptionSchema>;

export const AzureResourceSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  location: z.string(),
  resourceGroup: z.string(),
  subscriptionId: z.string(),
  /** The security-relevant configuration surface (flattened). */
  properties: z.record(z.string(), z.unknown()),
  tags: z.record(z.string(), z.string()).optional(),
});
export type AzureResource = z.infer<typeof AzureResourceSchema>;

export const AzureRoleAssignmentSchema = z.object({
  roleName: z.string(),
  scope: z.string(),
});

export const AzureIdentitySchema = z.object({
  id: z.string(),
  type: z.enum(["user", "servicePrincipal", "managedIdentity"]),
  displayName: z.string(),
  mfaEnabled: z.boolean().optional(),
  roleAssignments: z.array(AzureRoleAssignmentSchema),
});
export type AzureIdentity = z.infer<typeof AzureIdentitySchema>;

export const NetworkExposureSchema = z.object({
  resourceId: z.string(),
  direction: z.enum(["inbound", "outbound"]),
  protocol: z.string(),
  port: z.union([z.number(), z.string()]),
  source: z.string(),
  destination: z.string(),
});
export type NetworkExposure = z.infer<typeof NetworkExposureSchema>;

export const PolicyStateSchema = z.object({
  policyName: z.string(),
  resourceId: z.string(),
  compliant: z.boolean(),
});
export type PolicyState = z.infer<typeof PolicyStateSchema>;

export const AzureEnvironmentSnapshotSchema = z.object({
  /** Snapshot schema version. Defaults so older fixtures still parse. */
  snapshotVersion: z.string().default(SNAPSHOT_VERSION),
  tenantId: z.string(),
  capturedAt: z.string(),
  subscriptions: z.array(AzureSubscriptionSchema),
  resources: z.array(AzureResourceSchema),
  identities: z.array(AzureIdentitySchema),
  /** Inbound/outbound network exposures distilled from NSGs, public IPs, firewalls. */
  networkExposures: z.array(NetworkExposureSchema),
  /** Azure Policy / benchmark compliance states, where available. */
  policyStates: z.array(PolicyStateSchema),
});
export type AzureEnvironmentSnapshot = z.infer<typeof AzureEnvironmentSnapshotSchema>;

/**
 * PORT: how the scanner obtains an environment. `FixtureAzureConnector` reads a
 * recorded snapshot (offline); `LiveAzureConnector` queries Azure (live).
 */
export interface AzureConnector {
  readonly mode: "offline" | "live";
  capture(scope: { subscriptionIds?: string[] }): Promise<AzureEnvironmentSnapshot>;
}
