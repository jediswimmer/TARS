# TARS — Tactical Analysis and Reporting System

An ever-expanding fleet of narrowly-scoped, scheduled agents for an MSP. Each
agent owns one job, runs on a schedule, and hands a typed artifact to the next —
together covering every facet of a customer's environment and their experience of
working with the MSP.

The first workflow is **Azure security**: an adversarial scan → expert review →
technical report → executive & VP/IT views → dashboard notifications → an
RBAC-scoped customer-service chat. It's built "right" once on **Claude**, then
replicated on **Grok** and **Sol** to compare the three LLMs on identical work.

## Try it in 30 seconds (no credentials)

```bash
pnpm install
pnpm demo          # runs the whole Azure fleet OFFLINE against a fixture tenant
open portal/mockup/dashboard.html   # the target dashboard, interactive
```

`pnpm demo` runs all six agents against the recorded Contoso Financial tenant
using a replay LLM (no API key), writes the artifacts under `runs/artifacts/`,
and prints what each stage produced. For a live run:

```bash
cp .env.example .env      # set ANTHROPIC_API_KEY
TARS_MODE=live pnpm pipeline:azure
```

## Architecture in one breath

A **shared spine** (`platform/`) holds everything that must be identical to
compare the LLMs fairly — data contracts, Azure connectors, the orchestrator, the
eval harness, the portal. The `providers/{claude,grok,sol}` folders hold only the
swappable agent *brains*. Every agent talks to an `LlmProvider` **port**; swap the
injected provider and the same fleet runs on a different model. Agents hand off
**typed artifacts**; the pipeline is a DAG wired by artifact kind.

```
platform/contracts   → artifact schemas + agent/port interfaces (the spine)
platform/core        → BaseAgent, artifact store, registry, logging
platform/connectors  → Azure (read-only) → normalized environment snapshot
platform/orchestrator→ pipeline runner + scheduler + offline replay
platform/evals       → cross-provider bake-off harness
providers/claude     → reference fleet (Anthropic SDK)   ← build here first
providers/grok, sol  → xAI / OpenAI fleets (port seam ready)
portal               → customer portal + main dashboard (+ live mockup)
```

## Read the plan

| Doc | What |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The master architecture + data flow |
| [docs/AGENT-FLEET.md](docs/AGENT-FLEET.md) | The fleet, how an agent is built, the growth recipe |
| [docs/DATA-CONTRACTS.md](docs/DATA-CONTRACTS.md) | The artifact schemas (the crux) |
| [docs/PROVIDER-COMPARISON.md](docs/PROVIDER-COMPARISON.md) | How the Claude/Grok/Sol bake-off stays fair |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased execution plan |
| [docs/adr/](docs/adr/) | Key decisions (shared spine, TS monorepo, artifact handoffs) |

## Status

Phase 0 (foundation) is in place: the full contract set, the Claude reference
fleet, the offline-runnable pipeline, and the dashboard mockup. Grok and Sol are
scaffolded with a documented porting recipe. See the roadmap for what's next.
