import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { AzureConnector, AzureEnvironmentSnapshot } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));

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
 * Implementation seam (Phase 2). Authenticate with @azure/identity
 * (ClientSecretCredential from AZURE_* env), then:
 *   • resources + config  → Azure Resource Graph (@azure/arm-resourcegraph)
 *   • identities + MFA     → Microsoft Graph (/users, /reports, roleAssignments)
 *   • network exposures    → Resource Graph over NSG rules + public IPs
 *   • policyStates         → Defender for Cloud assessments (@azure/arm-security)
 * Map each into the AzureEnvironmentSnapshot shape and return it. Nothing
 * downstream changes — the scanner already speaks snapshot.
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

  async capture(): Promise<AzureEnvironmentSnapshot> {
    throw new Error(
      "LiveAzureConnector.capture() is a Phase-2 seam. Install the @azure/* SDKs " +
        "and implement the Resource Graph + Microsoft Graph + Defender queries " +
        `(read-only SP for tenant ${this.creds.tenantId}). See docs/AGENT-FLEET.md.`,
    );
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
