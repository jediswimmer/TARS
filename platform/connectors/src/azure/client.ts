import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ClientSecretCredential } from "@azure/identity";
import { ResourceGraphClient } from "@azure/arm-resourcegraph";
import { SecurityCenter } from "@azure/arm-security";
import { Client } from "@microsoft/microsoft-graph-client";
// Subpath auth provider that bridges an @azure/identity credential into Graph.
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import type {
  DirectoryObject,
  DirectoryRole,
  ServicePrincipal,
  User,
  UserRegistrationDetails,
} from "@microsoft/microsoft-graph-types";
import type {
  AzureConnector,
  AzureEnvironmentSnapshot,
  AzureIdentity,
  AzureResource,
  AzureSubscription,
  NetworkExposure,
  PolicyState,
} from "./types.js";
import {
  NSG_EXPOSURES_KQL,
  RESOURCES_KQL,
  SUBSCRIPTIONS_KQL,
  normalizePorts,
  pageAll,
  runResourceGraphQuery,
  safe,
} from "./live-queries.js";
import type { NsgExposureRow, ResourceRow, SubscriptionRow } from "./live-queries.js";

const here = dirname(fileURLToPath(import.meta.url));

/** A directory role assignment attached to a principal. */
type RoleAssignment = { roleName: string; scope: string };

/**
 * Offline connector: replays a recorded snapshot. Point it at any recorded
 * tenant JSON. Ships with the Contoso Financial fixture (deliberately
 * misconfigured) so `pnpm demo` produces a meaningful scan with zero credentials.
 */
export class FixtureAzureConnector implements AzureConnector {
  readonly mode = "offline" as const;
  constructor(private readonly fixturePath = join(here, "fixtures", "contoso-financial.json")) {}

  async capture(): Promise<AzureEnvironmentSnapshot> {
    return JSON.parse(await readFile(this.fixturePath, "utf8")) as AzureEnvironmentSnapshot;
  }
}

/**
 * Live connector: queries the real tenant with a READ-ONLY service principal.
 *
 * Authenticates once with @azure/identity (client-credentials / app-only) and
 * fans the credential out to three planes:
 *   • resources + config  → Azure Resource Graph (@azure/arm-resourcegraph)
 *   • identities + MFA     → Microsoft Graph (/users, /reports, /directoryRoles)
 *   • network exposures    → Resource Graph over NSG securityRules
 *   • policyStates         → Defender for Cloud assessments (@azure/arm-security)
 * Everything is mapped into the AzureEnvironmentSnapshot shape the scanner
 * already speaks. Optional signals degrade gracefully; a hard auth/query
 * failure throws with context.
 */
export class LiveAzureConnector implements AzureConnector {
  readonly mode = "live" as const;
  constructor(
    private readonly creds: {
      tenantId: string;
      clientId: string;
      clientSecret: string;
      subscriptionId: string;
    },
  ) {}

  async capture(scope: { subscriptionIds?: string[] } = {}): Promise<AzureEnvironmentSnapshot> {
    const { tenantId, clientId, clientSecret, subscriptionId } = this.creds;
    const subscriptionIds =
      scope.subscriptionIds && scope.subscriptionIds.length > 0
        ? scope.subscriptionIds
        : [subscriptionId];

    // @azure/identity — app-only (client credentials) flow with a read-only SP.
    // Token acquisition is lazy: bad credentials surface on the first API call.
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

    // Microsoft Graph client, authenticated by the same credential.
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ["https://graph.microsoft.com/.default"],
    });
    const graph = Client.initWithMiddleware({ authProvider });

    // Azure Resource Graph — cross-subscription KQL over the ARM control plane.
    const rg = new ResourceGraphClient(credential);

    try {
      // ---- resources (Resource Graph; mandatory — hard-fails on auth error) ----
      const resourceRows = await runResourceGraphQuery<ResourceRow>(
        rg,
        subscriptionIds,
        RESOURCES_KQL,
      );
      const resources = resourceRows.map(toAzureResource);

      // ---- subscriptions (names via resourcecontainers; counts from resources) ----
      const subNameRows = await safe<SubscriptionRow[]>(
        "subscription metadata",
        () => runResourceGraphQuery<SubscriptionRow>(rg, subscriptionIds, SUBSCRIPTIONS_KQL),
        [],
      );
      const subscriptions = buildSubscriptions(subscriptionIds, subNameRows, resources);

      // ---- network exposures (Resource Graph over NSG rules) ----
      const nsgRows = await safe<NsgExposureRow[]>(
        "network exposures",
        () => runResourceGraphQuery<NsgExposureRow>(rg, subscriptionIds, NSG_EXPOSURES_KQL),
        [],
      );
      const networkExposures = buildExposures(nsgRows);

      // ---- identities (Microsoft Graph) ----
      const identities = await this.captureIdentities(graph);

      // ---- policy states (Defender for Cloud) ----
      const policyStates = await this.capturePolicyStates(credential, subscriptionIds);

      return {
        tenantId,
        capturedAt: new Date().toISOString(),
        subscriptions,
        resources,
        identities,
        networkExposures,
        policyStates,
      };
    } catch (err) {
      // A failure here is a hard one (auth, or the mandatory resources/users
      // query) — the optional signals above swallow their own errors. Surface
      // it with context rather than a bare SDK stack.
      throw new Error(
        `LiveAzureConnector.capture() failed for tenant ${tenantId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { cause: err },
      );
    }
  }

  /**
   * Directory principals + their security posture, joined by object id:
   *   • /users                                          — the principals
   *   • /reports/.../userRegistrationDetails            — MFA registration
   *   • /directoryRoles + /members                      — privileged roles
   *   • /servicePrincipals                              — SP identities
   * `/users` is mandatory; the rest degrade to empty on missing permissions.
   */
  private async captureIdentities(graph: Client): Promise<AzureIdentity[]> {
    // /users — core directory principals (mandatory; hard-fails on Graph auth error).
    const users = await pageAll<User>(
      graph,
      graph.api("/users").select("id,userPrincipalName,displayName"),
    );

    // /reports/authenticationMethods/userRegistrationDetails — per-user MFA
    // registration. Needs AuditLog.Read.All + Entra ID P1/P2; degrade if absent.
    const mfaRows = await safe<UserRegistrationDetails[]>(
      "MFA registration report",
      () =>
        pageAll<UserRegistrationDetails>(
          graph,
          graph
            .api("/reports/authenticationMethods/userRegistrationDetails")
            .select("id,userPrincipalName,isMfaRegistered"),
        ),
      [],
    );
    const mfaByUser = new Map<string, boolean>();
    for (const row of mfaRows) {
      if (row.id && typeof row.isMfaRegistered === "boolean") {
        mfaByUser.set(row.id, row.isMfaRegistered);
      }
    }

    // /directoryRoles (+ members) — privileged, tenant-scoped role assignments.
    const rolesByPrincipal = await safe<Map<string, RoleAssignment[]>>(
      "directory role assignments",
      () => this.captureRoleAssignments(graph),
      new Map<string, RoleAssignment[]>(),
    );

    // /servicePrincipals — optional; included so SP identities show up too.
    const servicePrincipals = await safe<ServicePrincipal[]>(
      "service principals",
      () =>
        pageAll<ServicePrincipal>(
          graph,
          graph.api("/servicePrincipals").select("id,displayName,appId"),
        ),
      [],
    );

    const identities: AzureIdentity[] = [];

    for (const u of users) {
      if (!u.id) continue;
      const identity: AzureIdentity = {
        id: u.id,
        type: "user",
        displayName: u.displayName ?? u.userPrincipalName ?? u.id,
        roleAssignments: rolesByPrincipal.get(u.id) ?? [],
      };
      const mfa = mfaByUser.get(u.id);
      if (mfa !== undefined) identity.mfaEnabled = mfa;
      identities.push(identity);
    }

    for (const sp of servicePrincipals) {
      if (!sp.id) continue;
      identities.push({
        id: sp.id,
        type: "servicePrincipal",
        displayName: sp.displayName ?? sp.appId ?? sp.id,
        roleAssignments: rolesByPrincipal.get(sp.id) ?? [],
      });
    }

    return identities;
  }

  /**
   * Map each activated directory role to its members. Only roles with at least
   * one assignment are returned by /directoryRoles, so this naturally captures
   * the privileged principals. Directory roles are tenant-scoped ("/").
   */
  private async captureRoleAssignments(graph: Client): Promise<Map<string, RoleAssignment[]>> {
    const byPrincipal = new Map<string, RoleAssignment[]>();
    const roles = await pageAll<DirectoryRole>(
      graph,
      graph.api("/directoryRoles").select("id,displayName"),
    );
    for (const role of roles) {
      if (!role.id) continue;
      const roleName = role.displayName ?? role.id;
      const members = await pageAll<DirectoryObject>(
        graph,
        graph.api(`/directoryRoles/${role.id}/members`).select("id"),
      );
      for (const member of members) {
        if (!member.id) continue;
        const list = byPrincipal.get(member.id) ?? [];
        list.push({ roleName, scope: "/" });
        byPrincipal.set(member.id, list);
      }
    }
    return byPrincipal;
  }

  /**
   * Defender for Cloud assessments per subscription. Each assessment maps to a
   * PolicyState; `status.code === "Healthy"` means compliant. Defender may be
   * off for a subscription, so failures degrade that subscription to no states.
   */
  private async capturePolicyStates(
    credential: ClientSecretCredential,
    subscriptionIds: string[],
  ): Promise<PolicyState[]> {
    const states: PolicyState[] = [];
    for (const subscriptionId of subscriptionIds) {
      // @azure/arm-security — Defender is scoped per subscription.
      const sec = new SecurityCenter(credential, subscriptionId);
      const scope = `/subscriptions/${subscriptionId}`;
      await safe<void>(
        `Defender assessments for ${subscriptionId}`,
        async () => {
          // assessments.list returns a PagedAsyncIterableIterator (auto-paged).
          for await (const a of sec.assessments.list(scope)) {
            const resourceId = assessedResourceId(a.resourceDetails) ?? a.id ?? scope;
            states.push({
              policyName: a.displayName ?? a.name ?? "unknown assessment",
              resourceId,
              compliant: a.status?.code === "Healthy",
            });
          }
        },
        undefined,
      );
    }
    return states;
  }
}

/** Factory used by the orchestrator based on TARS_MODE. */
export function makeAzureConnector(
  mode: "offline" | "live",
  creds?: ConstructorParameters<typeof LiveAzureConnector>[0],
): AzureConnector {
  if (mode === "live") {
    if (!creds) throw new Error("Live mode requires Azure credentials (AZURE_* env).");
    return new LiveAzureConnector(creds);
  }
  return new FixtureAzureConnector();
}

// ---------------------------------------------------------------------------
// Row → snapshot mapping helpers.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Pull the assessed Azure resource id from a Defender assessment's
 * `resourceDetails`. The SDK union doesn't discriminate cleanly on `source`, so
 * we read it defensively rather than lean on the declared type.
 */
function assessedResourceId(details: unknown): string | undefined {
  if (isRecord(details) && details.source === "Azure" && typeof details.id === "string") {
    return details.id;
  }
  return undefined;
}

/** Resource Graph row → AzureResource (properties kept as the flattened config). */
function toAzureResource(row: ResourceRow): AzureResource {
  const resource: AzureResource = {
    id: row.id,
    type: row.type,
    name: row.name,
    location: row.location,
    resourceGroup: row.resourceGroup ?? "",
    subscriptionId: row.subscriptionId,
    properties: isRecord(row.properties) ? row.properties : {},
  };
  if (isRecord(row.tags)) resource.tags = row.tags as Record<string, string>;
  return resource;
}

/** One AzureSubscription per scoped id, named from Resource Graph, counted from resources. */
function buildSubscriptions(
  subscriptionIds: string[],
  subNameRows: SubscriptionRow[],
  resources: AzureResource[],
): AzureSubscription[] {
  const nameById = new Map(subNameRows.map((s) => [s.subscriptionId, s.name]));
  return subscriptionIds.map((id) => ({
    id,
    name: nameById.get(id) ?? id,
    resourceCount: resources.filter((r) => r.subscriptionId === id).length,
  }));
}

/** NSG allow-rule rows → NetworkExposure[], one per exposed port. */
function buildExposures(rows: NsgExposureRow[]): NetworkExposure[] {
  const exposures: NetworkExposure[] = [];
  for (const row of rows) {
    for (const port of normalizePorts(row.port, row.ports)) {
      exposures.push({
        resourceId: row.nsgId,
        direction: "inbound",
        protocol: row.protocol || "*",
        port,
        source: row.source || "*",
        destination: row.nsgName,
      });
    }
  }
  return exposures;
}
