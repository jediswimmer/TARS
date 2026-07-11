# 080 — Customer Lifecycle (F8) · aggregators

## Facet & goal
**Facet F8 — customer lifecycle.** Not a data-collection facet — a set of
**aggregators** that consume the *other* facets' artifacts: an **onboarding**
agent (baseline capture + gap list for a new customer), a **QBR generator** (the
deferred cross-facet unified rollup — quarterly business review from Azure + M365 +
cost + backup reports), and a **health score** (single composite per customer).
Runs late because it needs multiple facets producing artifacts.

## Orientation, commands, guardrails, recipe
See `000-overview.md`. Guardrails unchanged, plus: aggregators are **read-only over
the store** — they consume artifacts, never re-query tenants.

## Depends on
- Multiple facets emitting reports (`010`, `020`, at least one of `040`/`070`).
- The pipeline registry + parameterized agents (S2, `030`).

## Current state
- No aggregator agents. `store.list({ customerId, kind })`
  (`platform/contracts/src/artifact.ts`) already supports cross-kind retrieval per
  customer — the aggregators' input mechanism.

## Slices
### Slice 1 — Health score (deterministic)
`health-scorer`: pure-code composite from the latest report of each facet
(weighted, like `platform/evals` `compareRuns`). New `ArtifactKind`:
`customer_health`. LLM narrates only.
### Slice 2 — QBR generator (unified rollup)
`qbr-author`: consumes the latest per-facet reports for a customer + the health
score → a `qbr_report` (cross-facet narrative, the deferred M365 unified rollup
lives here). Per-domain M365 reports (`020`) roll up here, not in `020`.
### Slice 3 — Onboarding
`onboarding-agent`: first-run baseline + gap list for a new customer id.

## Live-validation gate
Tenant-zero = **Dynapt** — run the full fleet, then the aggregators, and produce a
real QBR + health score.

## Acceptance criteria
- `pnpm -r typecheck` + `pnpm test` green; scoring logic unit-tested; QBR renders
  coherently from multi-facet fixtures; health score reconciles with the
  underlying reports.
