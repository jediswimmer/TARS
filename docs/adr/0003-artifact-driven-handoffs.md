# ADR 0003 — Artifact-driven handoffs

**Status:** Accepted (Phase 0)

## Context

Agents form a cascading pipeline and must hand work to each other. How do stages
communicate, and how does the orchestrator wire them?

## Decision

Every agent **consumes zero or more typed artifacts and produces exactly one**.
Artifacts are the handoff currency; the pipeline is a DAG wired by artifact
`kind`. The runner resolves each agent's inputs by looking up the newest artifact
of each kind it `consumes`.

## Consequences

- ➕ Loose coupling: an agent knows only its input/output kinds, never its
  neighbors. Reordering or inserting a stage is a config change.
- ➕ Every artifact carries provenance (`producedBy`) and lineage (`inputs`),
  giving a full, git-diffable audit trail — a deliverable in itself for a
  publicly-traded customer.
- ➕ The store is the system of record; agents are stateless and independently
  retryable/schedulable.
- ➕ Cross-provider runs are diffable artifact-for-artifact (same envelope).
- ➖ "Newest of kind" resolution is simple but implicit; a branching DAG with
  multiple producers of one kind will need explicit run-scoped wiring. Deferred
  until a pipeline actually needs it.
