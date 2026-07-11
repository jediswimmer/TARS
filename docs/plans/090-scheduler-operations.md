# 090 — Scheduler & Operations (S3) · LAST

## Facet & goal
Not a facet — the **operations seam batch (S3)** that makes the fleet actually run
on a schedule in production. Executes **last**, once multiple fleets exist and are
worth scheduling. Turns the placeholder scheduler into a real `node-cron` daemon
over the fleet's declared `schedule` fields, then targets **Azure Container Apps
Jobs**, and swaps the file store for a persistent one.

## Orientation, commands, guardrails, recipe
See `000-overview.md`. Guardrails unchanged, plus: the daemon must be **idempotent
and observable** (structured logs, run ids) — a missed or double run must not
corrupt the store.

## Current state
- `platform/orchestrator/src/scheduler.ts` is a placeholder (not a running daemon).
- Every `AgentDefinition` already carries an optional `schedule` cron string
  (`platform/contracts/src/agent.ts`); the fleet tables in `docs/AGENT-FLEET.md`
  define the intended cadences.
- Store is `FileArtifactStore` (`platform/core/src/artifact-store.ts`) over
  `runs/<runId>/…` — fine for demo, not for a long-running daemon.
- Pipeline registry (S2, `030`) is a prerequisite — the scheduler dispatches
  pipelines by name.

## Slices
### Slice 1 — `collectSchedules()` + node-cron daemon
Walk the registry, collect `(pipeline, cron)` pairs, register them with `node-cron`,
dispatch `runPipeline(...)` per tick. Structured logging + run ids; overlap guard.
### Slice 2 — Persistent store
Implement the `ArtifactStore` port over Postgres/Blob (the interface already exists
— `platform/contracts/src/artifact.ts`); no agent changes.
### Slice 3 — Azure Container Apps Jobs
Package the daemon as an ACA Job (cron-triggered container). Config/secrets via
managed identity, not env files.

## Live-validation gate
Deploy against **Dynapt** as tenant-zero: the daemon runs the Azure (+ any merged)
pipelines on schedule, persists artifacts, and the portal reads them.

## Acceptance criteria
- `pnpm -r typecheck` + `pnpm test` green; scheduler unit-tested with a fake clock;
  overlap guard covered; persistent store passes the same store contract tests as
  `FileArtifactStore`; a scheduled run produces artifacts the portal renders.
