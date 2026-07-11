# 070 — Backup / DR Verification (F5)

## Facet & goal
**Facet F5 — backup & disaster-recovery verification.** A **collect → assess →
notify** shape with **no adversarial reviewer** — backup posture is deterministic
(a job either succeeded within RPO or it didn't), not contested. Verifies backup
coverage, last-successful-run recency, restore-test evidence, and RPO/RTO targets.

## Orientation, commands, guardrails, recipe
See `000-overview.md`. Guardrails unchanged.

## Depends on
- **`010`** (Azure resource inventory — to know what *should* be backed up and
  detect unprotected resources).

## Current state
- No backup connector/agent. Azure resource inventory exists in the snapshot
  (`010`); protection status is the new signal.

## Slices
### Slice 1 — Backup snapshot + connector
`BackupSnapshot` (Zod): Azure Backup / Recovery Services vault items, last job
status + timestamp, protected vs unprotected resources, restore-test evidence.
Fixture: an unprotected prod DB + a stale backup (fails) + a healthy protected
resource (pass).
### Slice 2 — Assess + notify agents
`backup-assessor` (deterministic coverage/RPO check → `backup_report`) →
`notification-agent` (reused). New `ArtifactKind`: `backup_report`. No reviewer.

## Live-validation gate
Tenant-zero = **Dynapt**. Grant: `Backup Reader` / Recovery Services reader.

## Acceptance criteria
- `pnpm -r typecheck` + `pnpm test` green; coverage/RPO logic unit-tested; fixture
  validates; unprotected-resource + stale-backup exemplars produce findings; healthy
  resource does not.
