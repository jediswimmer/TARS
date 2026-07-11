/**
 * A normalized, provider-agnostic snapshot of an Azure environment. The scanner
 * agent reasons over THIS, not raw ARM responses — which means (a) every LLM
 * sees byte-identical input, and (b) we can record/replay real tenants as
 * fixtures for offline runs and regression tests.
 */
export interface AzureEnvironmentSnapshot {
  tenantId: string;
  capturedAt: string;
  subscriptions: AzureSubscription[];
  resources: AzureResource[];
  identities: AzureIdentity[];
  /** Inbound/outbound network exposures distilled from NSGs, public IPs, firewalls. */
  networkExposures: NetworkExposure[];
  /** Azure Policy / benchmark compliance states, where available. */
  policyStates: PolicyState[];
}

export interface AzureSubscription {
  id: string;
  name: string;
  resourceCount: number;
}

export interface AzureResource {
  id: string;
  type: string;
  name: string;
  location: string;
  resourceGroup: string;
  subscriptionId: string;
  /** The security-relevant configuration surface (flattened). */
  properties: Record<string, unknown>;
  tags?: Record<string, string>;
}

export interface AzureIdentity {
  id: string;
  type: "user" | "servicePrincipal" | "managedIdentity";
  displayName: string;
  mfaEnabled?: boolean;
  roleAssignments: { roleName: string; scope: string }[];
}

export interface NetworkExposure {
  resourceId: string;
  direction: "inbound" | "outbound";
  protocol: string;
  port: number | string;
  source: string;
  destination: string;
}

export interface PolicyState {
  policyName: string;
  resourceId: string;
  compliant: boolean;
}

/**
 * PORT: how the scanner obtains an environment. `FixtureAzureConnector` reads a
 * recorded snapshot (offline); `LiveAzureConnector` queries Azure (live).
 */
export interface AzureConnector {
  readonly mode: "offline" | "live";
  capture(scope: { subscriptionIds?: string[] }): Promise<AzureEnvironmentSnapshot>;
}
