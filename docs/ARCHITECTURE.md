# TARS Architecture

**TARS — Tactical Analysis and Reporting System** — is an ever-expanding fleet
of narrowly-scoped, scheduled agents for an MSP. Each agent owns one job, runs
on a schedule, and hands a typed artifact to the next. Together they cover every
facet of a customer's environment and their experience of working with the MSP.

This document is the master architecture. It is deliberately provider-agnostic:
the same design is implemented by Claude, Grok, and Sol so the three can be
compared apples-to-apples.

## The three ideas everything rests on

1. **Ports & adapters (hexagonal).** The "what" (agent tasks, data contracts,
   orchestration, portal) is separated from the "who" (the LLM). Every agent
   talks to an `LlmProvider` **port**; each vendor supplies an **adapter**. To
   run the whole fleet on a different model you change one injected object.

2. **Artifacts are the handoff currency.** Every agent consumes zero or more
   typed artifacts and produces exactly one. The pipeline is just a DAG of
   agents wired by artifact *kind*. Because the artifact envelope is identical no
   matter which LLM produced it, runs are diffable across providers.

3. **A shared spine, swappable brains.** Everything that must be identical to
   compare fairly — contracts, Azure connectors, orchestrator, evals, portal —
   lives in `platform/`. Only the agent "brains" (prompts + model calls) live in
   the per-provider folders. No 3× duplication; a clean bake-off.

## Layered layout

```
TARS/
├── platform/                  # the provider-agnostic spine
│   ├── contracts/   (@tars/contracts)    Zod 4 artifact schemas + agent/port interfaces
│   ├── agents/      (@tars/agents)       the shared fleet: 6 agents + prompts, per-provider
│   ├── core/        (@tars/core)         BaseAgent, artifact store, registry, logging
│   ├── connectors/  (@tars/connectors)   Azure (+ future M365/RMM) → normalized snapshot
│   ├── orchestrator/(@tars/orchestrator) pipeline runner + scheduler + replay + bake-off
│   └── evals/       (@tars/evals)        cross-provider bake-off harness
├── providers/                 # thin adapters — one LlmProvider each, no agent logic
│   ├── claude/      (@tars/provider-claude)  Anthropic SDK (messages.parse + zodOutputFormat)
│   ├── grok/        (@tars/provider-grok)    xAI, OpenAI-compatible (chat.completions.parse)
│   └── sol/         (@tars/provider-sol)     OpenAI Responses API (responses.parse)
├── portal/          (@tars/portal)       Next.js 16 dashboard (RBAC, Recharts, chat)
└── docs/                                  this plan
```

## Data flow (the Azure sample workflow)

```
              ┌──────────────┐
 Azure tenant │  Connector   │  read-only SP → normalized AzureEnvironmentSnapshot
   (read-only)└──────┬───────┘
                     ▼
   scan_findings ┌─────────────────────┐
                 │ Azure Security       │  adversarial scan, documents findings
                 │ Scanner              │
                 └─────────┬───────────┘
                           ▼ reviewed_findings
                 ┌─────────────────────┐
                 │ Azure Security       │  validates, kills false positives,
                 │ Reviewer             │  risk-scores, adds remediation
                 └─────────┬───────────┘
                           ▼ security_report
                 ┌─────────────────────┐
                 │ Report Author        │  canonical technical documentation
                 └─────────┬───────────┘
                 ┌─────────┴───────────┐
                 ▼                     ▼
        executive_view          technical_view
     ┌───────────────┐      ┌────────────────────┐
     │ Executive View│      │ Technical View      │  VP/IT-Director POV,
     │ (owner POV)   │      │ (public-co detail)  │  compliance + audit rigor
     └───────┬───────┘      └─────────┬──────────┘
             └──────────┬─────────────┘
                        ▼ notifications
              ┌────────────────────┐
              │ Notification Agent │  ranks + promotes high-value items (RBAC-stamped)
              └─────────┬──────────┘
                        ▼
              ┌────────────────────┐        ┌───────────────────────┐
              │  Main Dashboard    │◀──────▶│ Customer Service Agent│ (RBAC-scoped chat)
              │  (RBAC-gated)      │        └───────────────────────┘
              └────────────────────┘
```

Each later stage reads the newest artifact of the kind it `consumes` — so the
ordered stage list *is* the DAG. Adding a new agent is: define its
consumes/produces, implement `produce()`, register it.

## Runtime & scheduling

Agents declare a cron `schedule`. In the MVP the orchestrator surfaces the
schedule table and runs pipelines on demand (`runPipeline`). Production turns
each schedule into a real trigger — the recommended path is **Azure Container
Apps Jobs** or a durable engine (Temporal/Inngest), since customer environments
are already in Azure. The agent contract is runtime-agnostic, so this swap
touches only the orchestrator.

## Persistence

Artifacts are the system of record. The `ArtifactStore` port has a filesystem
implementation for dev (git-diffable runs under `runs/artifacts/`) and swaps to
Postgres/Blob in production without touching a single agent. Every artifact
carries provenance (`producedBy`) and lineage (`inputs`), giving a full audit
trail — which is itself a deliverable for a publicly-traded customer.

## Security posture

- The scanner authenticates with a **read-only** Azure service principal
  (Reader + Security Reader). It never mutates the customer environment.
- "Adversarial scan" = an **authorized** security assessment of the customer's
  own tenant — standard, legitimate MSP work.
- RBAC is a contract (`platform/contracts/src/rbac.ts`), enforced at retrieval
  and notification time, not bolted onto the UI.
- Secrets live in env/secret-managers, never in artifacts or prompts.

## Why this makes the bake-off fair

Swap the injected `LlmProvider` and the *identical* connectors, contracts,
orchestrator, and eval harness run. Differences in the output artifacts are
attributable to the model (and its prompt tuning), not to divergent plumbing.
See `PROVIDER-COMPARISON.md`.
