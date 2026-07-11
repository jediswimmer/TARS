# Roadmap

How we execute, in order. Each phase is shippable on its own.

## Phase 0 — Foundation ✅ (this session)

- Monorepo + shared spine: `contracts`, `core`, `connectors`, `orchestrator`, `evals`.
- Full data contracts (Zod) for the Azure workflow, end to end.
- Reference fleet on **Claude**: scanner → reviewer → report → exec/technical
  views → notifications, plus the interactive customer-service agent.
- `grok` / `sol` provider folders with the port seam + porting recipe.
- Offline replay so the whole pipeline runs with **no credentials**
  (`pnpm demo`).
- Dashboard mockup realizing the checkbox → hero drill-down interaction.
- This plan (architecture, fleet, contracts, comparison, ADRs).

## Phase 1 — Make Claude real end-to-end

- Run the pipeline live against the fixture tenant with a real key
  (`TARS_MODE=live pnpm pipeline:azure`) and tune the six system prompts.
- `LiveAzureConnector`: implement the Resource Graph / Microsoft Graph / Defender
  queries behind a read-only SP (seam in `azure/client.ts`).
- Add unit tests for the contracts + a golden-artifact test per stage.
- Wire a real scheduler (Azure Container Apps Jobs or Inngest) off the agents'
  `schedule` fields.

## Phase 2 — The bake-off

- Implement `GrokProvider` and `SolProvider` (`complete()` against their
  structured-output APIs).
- Port the agents into `providers/grok` and `providers/sol`; tune per model.
- Build a golden baseline for the fixture tenant (known findings + severities).
- Implement the LLM-judge for `reportQuality`; produce the first comparison
  report (a meta-dashboard of provider-vs-provider on the rubric).

## Phase 3 — The portal

- Stand up the Next.js app from `portal/` (App Router + Tailwind + shadcn +
  Recharts), importing `@tars/contracts` types.
- Main dashboard: infographic KPIs, priority-ordered notification list with
  checkboxes, live drill-down with a hero visualization (per the mockup).
- RBAC-gated routes; role resolution via the MSP's IdP.
- Wire the customer-service chat to `CustomerServiceAgent` with RBAC-scoped
  retrieval.

## Phase 4 — Expand the fleet

Add the next scheduled agents behind the same contract, each a small PR:
Microsoft 365 / Intune posture, endpoint & RMM health, backup verification,
patch compliance, cost optimization, SLA / ticket summaries, customer
onboarding. Multi-customer scale-out + per-customer config.

## Guardrails carried through every phase

- Read-only Azure access; secrets never in artifacts or prompts.
- Every bounded run (`top-N`, no-retry, sampling) logs what it dropped.
- Findings are verified before they reach a customer (the reviewer stage exists
  for exactly this) — no unreviewed model output in a customer-facing report.
