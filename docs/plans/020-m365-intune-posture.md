# 020 — M365 / Intune Posture (F2) · the second facet

## Facet & goal
**Facet F2 — Microsoft 365 / Intune posture.** The second MSP facet and the first
*new* pipeline. Same 6-role adversarial shape as Azure (scanner → reviewer →
report-author → exec-view → tech-view → notification), a **separate M365 snapshot**
and fleet, producing **per-domain reports** (one report per customer tenant/domain;
a unified cross-tenant rollup is deferred to the QBR generator in `080`). This is
the doc that **forces the S2 seams** — you cannot cleanly stand up a second
pipeline without them, so `020` and `030` are executed together (or `030` first).

## Orientation, commands, guardrails, recipe
See `000-overview.md` for the full 10-line orientation block and the growth recipe
(copy them into the PR description). Short forms:

```bash
pnpm install && pnpm -r typecheck && pnpm test && pnpm demo
```
Guardrails: read-only connectors · secrets never in artifacts · reviewer gate ·
demo-coherence (fixture valid, canned run regenerated, fail+pass exemplars).

## Depends on
- **`010` slice 0 (S1)** — Zod snapshot + CLI flags — must be merged first.
- **`030` (S2 seams)** — generic `Connector<S>`, config namespacing, parameterized
  view/notification agents, pipeline registry. Do `030` before or during this.

## Current state
- Only one fleet + one pipeline exist: `createAzureFleet()` and
  `AZURE_SECURITY_PIPELINE` (`platform/agents/src/fleet.ts`).
- The view agents hardcode `consumes: ["security_report"]` and
  `ctx.inputs.find(a => a.kind === "security_report")`
  (`platform/agents/src/report-views.ts`) — they must be parameterized (S2) before
  an M365 report can reuse them.
- `run.ts` still hard-rejects any pipeline name but `azure-security` — the registry
  (S2) replaces that.
- No M365 connector exists yet; the Graph client plumbing in
  `platform/connectors/src/azure/client.ts` (auth provider, `pageAll`) is reusable.

## Slices
### Slice 0 — M365 snapshot + connector
`platform/connectors/src/m365/types.ts` — `M365Snapshot` (Zod) reusing the `entra`
sub-snapshot from `010` slice 1. Domains covered: **Exchange Online** (mailbox
auth, external forwarding), **SharePoint/OneDrive** (external sharing),
**Teams** (guest/federation policy), **Intune** (compliance policies, enrolled
device posture). `M365FixtureConnector` + `LiveM365Connector` (Graph:
`/security/secureScores`, `/deviceManagement/*`, `/policies`). Fixture: a demo
tenant with fail+pass exemplars per domain.

### Slice 1 — M365 fleet + per-domain report
`createM365Fleet()` reusing the parameterized scanner/reviewer/report-author/view/
notification classes (post-S2). New `ArtifactKind`s by convention:
`m365_scan_findings`, `m365_reviewed_findings`, `m365_report`. Register
`M365_SECURITY_PIPELINE` in the pipeline registry (S2). Per-domain report =
`report-author` runs with an M365 report schema scoped to the tenant/domain.

### Slice 2 — portal wiring
Surface M365 notifications + report alongside Azure in the dashboard (same RBAC
gates). No new viz needed beyond WS1.

## Live-validation gate
Tenant-zero = **Dynapt's own M365 tenant**. Grants (least-privilege, read-only):
`SecurityEvents.Read.All`, `DeviceManagementConfiguration.Read.All`,
`DeviceManagementManagedDevices.Read.All`, `Policy.Read.All`,
`Sharing.Read.All`/`Sites.Read.All`. Acceptance: `pnpm pipeline:m365
--connector=live --customer=dynapt` succeeds.

## Acceptance criteria
- `pnpm -r typecheck` + `pnpm test` green; M365 fixture validates.
- `pnpm demo` (or `pnpm pipeline:m365`) produces a coherent per-domain report.
- Each domain check has fail+pass exemplars; reviewer rejects the bait.
- Azure pipeline unchanged (no regression from the S2 refactor).
