# ADR 0002 — TypeScript monorepo

**Status:** Accepted (Phase 0)

## Context

The platform spans LLM agents, cloud connectors, an orchestrator, and a
high-design interactive dashboard, across three LLM vendors.

## Decision

A single **TypeScript monorepo** (pnpm workspaces): agents + orchestrator +
portal in one language, shared types flowing end-to-end from `@tars/contracts`.

## Consequences

- ➕ Zod schemas are the single source of truth for both runtime validation of
  LLM output and compile-time types — no drift, no serialization mismatch
  between agents and the portal.
- ➕ All three LLM SDKs are first-class in TS (Anthropic; xAI and OpenAI via the
  `openai` client). The bespoke dashboard is web-native.
- ➕ One toolchain, one mental model across the whole stack.
- ➖ Python has richer turnkey Azure/security libraries. Mitigation: a connector
  is just "something that emits a snapshot conforming to the schema" — it can be
  a Python microservice later without disturbing the contract. The Azure work
  here is API calls, which TS handles well (`@azure/*`, Microsoft Graph JS).
- Rejected: Python-for-agents + TS-for-portal (a language boundary + duplicated
  artifact types on both sides).
