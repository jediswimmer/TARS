# 040 — Cost / Licensing / CSP (F6 + F6b) · Phase 3

## Facet & goal
**Facet F6 — cost, licensing & CSP economics** (+ **F6b — GDAP health**). The
first **deterministic** facet: the numbers are computed in code (Partner Center +
Azure cost APIs), and the LLM only **narrates** — it never does arithmetic. High
commercial value: Partner Center margin/licensing data is a goldmine for MSP QBRs.
Stays **Phase 3**, behind M365 (`020`).

## Orientation, commands, guardrails, recipe
See `000-overview.md`. Guardrails unchanged, plus: **LLM narrates, never computes**
— all totals/deltas are unit-tested pure functions; the agent prompt receives
finished numbers.

## Current state
- No cost connector or agent exists. `platform/evals` shows the pattern for
  code-computed metrics narrated later (`RunMetrics` / `compareRuns`).
- Deterministic facets **skip the adversarial reviewer** — collect → compute →
  narrate → notify.

## Slices
### Slice 1 — Cost snapshot + connectors (deterministic)
`CostSnapshot` (Zod): Azure consumption by subscription/resource-group/service
(Cost Management API), CSP license inventory + margin (Partner Center API), unused/
underutilized license counts. `CostFixtureConnector` + live connectors. Fixture:
a tenant with obvious waste (unassigned licenses, oversized VM) + a healthy line.
### Slice 2 — Cost agents
`cost-analyzer` (pure code: totals, month-over-month deltas, waste detection) →
`cost-narrator` (LLM narrates the computed `cost_report`). New `ArtifactKind`s:
`cost_report`. No reviewer stage.
### Slice 3 — GDAP health (F6b)
Delegated-admin relationship posture: expiring GDAP relationships, over-broad
delegated roles. Small snapshot addition + a check with fail+pass exemplars.

## Live-validation gate
Tenant-zero = **Dynapt**. Grants: Partner Center app (read-only, `Partner.Read`),
Azure `Cost Management Reader`. Acceptance: `pnpm pipeline:cost --connector=live
--customer=dynapt` succeeds.

## Acceptance criteria
- `pnpm -r typecheck` + `pnpm test` green; cost math has unit tests (the LLM is not
  in the arithmetic path); fixture validates; fail+pass exemplars present.
