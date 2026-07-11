# 030 — Platform Seams (S2) · generalize before the second facet

## Facet & goal
Not a facet — the **platform work** that lets facets multiply without forking the
orchestrator. Executes the **S2 seam batch**: a generic connector port, config
namespacing, parameterized view/notification agents, and a pipeline **registry**
replacing the single hardcoded pipeline. Do this before/with `020`.

## Orientation, commands, guardrails, recipe
See `000-overview.md`. Short forms: `pnpm -r typecheck && pnpm test && pnpm demo`.
Guardrails unchanged. This doc changes **shared spine** code (`contracts`,
`orchestrator`, `agents`) — per the sequencing rule, no other loop may touch
`contracts/` or the orchestrator in the same phase.

## Current state (the four hardcodes to remove)
1. **Connector port is Azure-specific:** `AzureConnector` interface in
   `platform/connectors/src/azure/types.ts` (`capture(scope)` → `AzureEnvironmentSnapshot`).
2. **Config is untyped free-form:** `pipeline.ts` passes `config: Record<string, unknown>`
   with `config.snapshot` singular (`run.ts`).
3. **View/notification agents hardcode `security_report`:**
   `platform/agents/src/report-views.ts` — `consumes: ["security_report"]` and
   `ctx.inputs.find(a => a.kind === "security_report")`.
4. **Pipeline is a single exported array + a throw:** `AZURE_SECURITY_PIPELINE`
   (`fleet.ts`) and `if (pipelineName !== "azure-security") throw` (`run.ts:19`).

## Slices
### Slice 1 — Generic `Connector<S>` port
Add `Connector<S>` to `platform/contracts` (or `platform/core`):
`interface Connector<S> { readonly mode: "offline"|"live"; capture(scope): Promise<S> }`.
`AzureConnector` becomes `Connector<AzureEnvironmentSnapshot>`. No behaviour change.

### Slice 2 — Config namespacing
Change per-run config to `snapshots: { azure?: AzureEnvironmentSnapshot; m365?: M365Snapshot }`
instead of a singular `snapshot`. Update the scanner to read `ctx.config.snapshots.azure`.
Keep a back-compat shim for one release if convenient.

### Slice 3 — Parameterize view + notification agents by consumed kind
`ReportViewAgent` takes the consumed report kind (`security_report` | `m365_report`)
as a constructor arg; `consumes` and the `ctx.inputs.find(...)` lookup use it. Same
for `NotificationAgent`. Azure fleet passes `security_report`; M365 fleet passes
`m365_report`.

### Slice 4 — Pipeline registry
Replace the exported array + throw with `PIPELINES: Record<string, string[]>`
(`azure-security`, later `m365-security`). `run.ts` looks the pipeline up by
`--pipeline`/argv and errors with the list of known names if absent.

## Acceptance criteria
- `pnpm -r typecheck` + `pnpm test` green; `pnpm demo` **diff-identical** (pure
  refactor, zero behaviour change).
- `AZURE_SECURITY_PIPELINE` resolvable through the registry; adding a second
  pipeline needs no orchestrator edit.
- View agents instantiable against a non-`security_report` kind (unit test).
