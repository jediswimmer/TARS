# ADR 0001 — Shared spine + provider adapters (not independent silos)

**Status:** Accepted (Phase 0)

## Context

The project needs three provider folders (Claude, Grok, Sol) to compare the LLMs
on the same MSP agent fleet. The fork: do the three folders share a platform
layer, or is each a fully independent vertical?

## Decision

A **shared `platform/` spine** (contracts, connectors, orchestrator, evals,
portal) with **per-provider adapters** that hold only the agent brains (prompts +
model calls) behind an `LlmProvider` port.

## Consequences

- ➕ The bake-off is fair: only the model varies, so output differences are
  attributable to the model, not divergent plumbing.
- ➕ No 3× duplication of non-LLM code; a new connector or portal feature is
  written once.
- ➕ Prompts still live in the provider folders, so per-model tuning (the
  "whole-approach" comparison) is fully supported.
- ➖ A shared contract change ripples to all providers — mitigated by
  `schemaVersion` on every artifact.
- Rejected: three independent verticals (≈3× effort, muddier comparison) and
  "shared contracts only" (still duplicates the presentation layer).
