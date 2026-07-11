# Roadmap

How we execute, in order. Each phase is shippable on its own.

## Phase 0 — Foundation ✅

- Monorepo + shared spine on current standards (TypeScript, **Zod 4**).
- Full data contracts for the Azure workflow, end to end.
- Reference fleet on Claude, offline-runnable pipeline, dashboard mockup, the plan.

## Phase 1 — Built right ✅ (this milestone)

- **Shared `@tars/agents` fleet**: the six agents + prompts, parameterized by
  provider with optional per-model prompt overrides. No triplication.
- **Three real provider adapters** with genuine structured outputs:
  - Claude — `messages.parse` + `zodOutputFormat`, adaptive thinking.
  - Grok — xAI (OpenAI-compatible) `chat.completions.parse` + `zodResponseFormat`.
  - Sol — OpenAI Responses API `responses.parse` + `zodTextFormat`.
- **Executable bake-off** (`pnpm bakeoff`) across all three, scored on the rubric.
- **Live Azure connector** (read-only): Resource Graph + Microsoft Graph (users/MFA/
  roles) + Defender assessments, mapped into the snapshot, with least-privilege
  graceful degradation.
- **Next.js 16 portal**: RBAC role switch, exec/technical dashboards, notification
  drill-down with Recharts, and an RBAC-scoped customer-service chat.
- **Tests + CI**: contract schema tests, eval-ranking test, pipeline-lineage test;
  a CI workflow that typechecks, tests, smoke-runs the pipeline, and builds the portal.

## Phase 2 — Live tenant & real comparison (in progress)

- ~~Tune structural scoring for the Contoso fixture~~ — shared `CONTOSO_GOLDEN`
  baseline, real per-finding `severityAccuracy`, LLM-as-judge for `reportQuality`,
  and published bake-off reports under `runs/bakeoff/`.
- Run the pipeline live against a real Azure tenant via `LiveAzureConnector` (wire
  the read-only service principal; the SDK calls are implemented). **Deferred** —
  fixture-first evals shipped first.
- Per-model prompt packs (whole-approach bake-off arm) still pending.
- Wire a real scheduler (Azure Container Apps Jobs or Inngest) off the agents'
  `schedule` fields.

## Phase 3 — Productionize the portal

- Real IdP for role resolution (NextAuth / the MSP's IdP) replacing the role switch.
- Point the portal at a persistent `ArtifactStore` (Postgres/Blob) instead of the
  bundled sample; proxy the chat to the agent backend.
- Multi-customer routing + per-customer config.

## Phase 4 — Expand the fleet

Add the next scheduled agents behind the same contract, each a small PR:
Microsoft 365 / Intune posture, endpoint & RMM health, backup verification, patch
compliance, cost optimization, SLA / ticket summaries, customer onboarding.

## Guardrails carried through every phase

- Read-only Azure access; secrets never in artifacts or prompts.
- Every bounded run (`top-N`, no-retry, sampling) logs what it dropped.
- No unreviewed model output reaches a customer-facing report — the reviewer stage
  exists for exactly this.
