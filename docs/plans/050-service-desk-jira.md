# 050 — Service Desk / Jira (F7) · safe parallel lane

## Facet & goal
**Facet F7 — service desk / ticketing.** A **collapsed** pipeline (no adversarial
scanner/reviewer): pull tickets, summarize, surface SLA risk and themes as
notifications. Chosen as the **safe parallel lane** — it touches **no Azure/Graph
surface**, so it can run concurrently with `010`/`030` without contending on the
shared connector or orchestrator internals.

## Orientation, commands, guardrails, recipe
See `000-overview.md`. Guardrails unchanged (read-only ticket API; scrub PII in
ticket bodies before it reaches an artifact).

## Current state
- No ticketing connector. Reuses the notification pattern
  (`platform/agents/src/notification.ts`, RBAC-stamped items) and the RBAC contract
  (`platform/contracts/src/rbac.ts`).

## Slices
### Slice 1 — Ticket snapshot + connector
`TicketSnapshot` (Zod): open tickets, priorities, SLA timers, age. `Jira` (and/or
generic) read-only connector. Fixture: a breaching ticket (fail) + a healthy one.
### Slice 2 — Summary + notification agents
`ticket-summarizer` (collapsed analyst stage → `ticket_summary`) →
`notification-agent` (reused, parameterized per S2). New `ArtifactKind`:
`ticket_summary`. RBAC: SLA breaches visible to owner + IT director.

## Live-validation gate
Tenant-zero = **Dynapt's** ticketing instance. Grant: read-only API token.

## Acceptance criteria
- `pnpm -r typecheck` + `pnpm test` green; fixture validates; SLA-breach exemplar
  produces a notification; healthy ticket does not.
