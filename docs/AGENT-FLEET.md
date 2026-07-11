# The Agent Fleet

Every agent is small, single-purpose, scheduled, and defined by an
`AgentDefinition` (`platform/contracts/src/agent.ts`). This is the starting
fleet — the Azure security workflow — and the recipe for growing it.

## The Azure security fleet (implemented for Claude)

| Agent | id | consumes | produces | schedule | Role |
|---|---|---|---|---|---|
| Azure Security Scanner | `azure-security-scanner` | — (reads snapshot) | `scan_findings` | `0 2 * * *` | Adversarial scan; documents every finding with an attack narrative + framework mappings. |
| Azure Security Reviewer | `azure-security-reviewer` | `scan_findings` | `reviewed_findings` | `0 3 * * *` | Validates, kills false positives, risk-scores, attaches remediation. |
| Report Author | `report-author` | `reviewed_findings`, `scan_findings` | `security_report` | `0 4 * * *` | Technical-documentation specialist; canonical, audience-neutral report. |
| Executive View | `executive-view` | `security_report` | `executive_view` | on handoff | Business-owner POV: risk, money, compliance standing, hero KPIs. |
| Technical View | `technical-view` | `security_report` | `technical_view` | on handoff | VP/IT-Director POV: full detail, control mappings, audit evidence. |
| Notification Agent | `notification-agent` | `security_report`, `reviewed_findings` | `notifications` | `*/30 * * * *` | Ranks + promotes high-value items to the dashboard, RBAC-stamped. |
| Customer Service | (interactive) | latest artifacts | — | live | RBAC-scoped chat grounded in the customer's artifacts. |

The Executive and Technical views work "hand in hand": both derive from the same
canonical `security_report`, so they can never disagree on the facts — only on
framing and depth.

## How an agent is built

A provider agent extends `BaseAgent<Body>` and implements `produce(ctx)`:

```ts
export class AzureSecurityScanner extends BaseAgent<ScanFindingsBody> {
  readonly definition = { id, name, description, provider: "claude",
    consumes: [], produces: "scan_findings", schedule: "0 2 * * *" };

  protected async produce(ctx) {
    const snapshot = ctx.config.snapshot;                 // from the connector
    const result = await ctx.llm.complete({               // the PORT, not the SDK
      system: SCANNER_SYSTEM,
      schema: ScannerOutput,                              // forces typed output
      messages: [{ role: "user", content: serialize(snapshot) }],
    });
    return { body: assemble(result.parsed), usage: result.usage };
  }
}
```

`BaseAgent.run()` wraps the body in a provenance-stamped artifact envelope and
persists it. The agent never touches the Anthropic SDK, the store, or scheduling
— only `ctx.llm`, its inputs, and its output body.

## Adding a new agent (the growth recipe)

1. If it introduces a new artifact type, add its schema to
   `platform/contracts/src/artifacts/` and to the `ArtifactKind` enum.
2. Implement `produce()` in the provider folder; write its system prompt.
3. Register it in the provider's `register…Fleet()`.
4. Add its id to the relevant pipeline in
   `platform/orchestrator/src/pipelines/`.

That's the whole loop. The fleet is designed to expand indefinitely — future
agents: Microsoft 365 / Intune posture, endpoint/RMM health, backup-verification,
patch-compliance, cost-optimization, SLA/ticket-summary, onboarding.

## Live Azure connector (Phase 2 seam)

The scanner reasons over a normalized `AzureEnvironmentSnapshot`
(`platform/connectors/src/azure/types.ts`), not raw ARM output — so every
provider sees byte-identical input and we can record real tenants as fixtures.

`FixtureAzureConnector` replays the recorded Contoso Financial tenant offline.
`LiveAzureConnector.capture()` is the seam to implement:

- **Authenticate** with `@azure/identity` `ClientSecretCredential` from the
  read-only SP (`AZURE_*` env).
- **Resources + config** → Azure Resource Graph (`@azure/arm-resourcegraph`).
- **Identities + MFA** → Microsoft Graph (`/users`, `/reports`, role assignments).
- **Network exposures** → Resource Graph over NSG rules + public IPs.
- **Policy states** → Defender for Cloud assessments (`@azure/arm-security`).

Map each into the snapshot shape and return it. Nothing downstream changes — the
scanner already speaks snapshot.
