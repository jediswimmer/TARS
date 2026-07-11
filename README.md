# TARS — Tactical Analysis and Reporting System

An ever-expanding fleet of narrowly-scoped, scheduled agents for an MSP. Each
agent owns one job, runs on a schedule, and hands a typed artifact to the next —
together covering every facet of a customer's environment and their experience of
working with the MSP.

The first workflow is **Azure security**: an adversarial scan → expert review →
technical report → executive & VP/IT views → dashboard notifications → an
RBAC-scoped customer-service chat. It's built once as a **shared fleet** and run
on **Claude**, **Grok**, and **Sol** (OpenAI) to compare the three LLMs on
identical work.

Built on current standards: **TypeScript · Zod 4 · Anthropic SDK (structured
outputs + adaptive thinking) · OpenAI SDK (Responses API) · Next.js 16 · React 19
· Tailwind 4 · Recharts**.

## Try it in 60 seconds (no credentials)

```bash
pnpm install
pnpm demo        # runs the whole 6-agent Azure fleet OFFLINE against a fixture tenant
pnpm bakeoff     # runs the identical pipeline on claude/grok/sol and ranks them
pnpm test        # 10 tests: contracts, eval ranking, pipeline lineage
pnpm portal      # the real Next.js dashboard at http://localhost:3000
```

`pnpm demo` runs all six agents against the recorded Contoso Financial tenant
using a replay LLM (no API key), writes provenance-stamped artifacts under
`runs/artifacts/`, and prints what each stage produced. For live runs:

```bash
cp .env.example .env          # set ANTHROPIC_API_KEY / XAI_API_KEY / OPENAI_API_KEY
TARS_MODE=live pnpm pipeline:azure          # real Claude fleet vs. the fixture tenant
TARS_MODE=live pnpm bakeoff                 # real 3-way bake-off
```

## Architecture in one breath

A **shared spine** (`platform/`) holds everything that must be identical to
compare the LLMs fairly — data contracts, the agent fleet, Azure connectors, the
orchestrator, the eval harness. The `providers/{claude,grok,sol}` folders are thin
adapters: each implements one `LlmProvider` and registers the shared fleet under
its name. Swap the injected provider and the same agents run on a different model.
Agents hand off **typed artifacts**; the pipeline is a DAG wired by artifact kind.

```
platform/contracts   → Zod 4 artifact schemas + agent/port interfaces (the spine)
platform/agents      → the shared fleet: 6 agents + prompts, parameterized by provider
platform/core        → BaseAgent, artifact store, registry, logging
platform/connectors  → Azure (read-only) → normalized snapshot (fixture + LIVE connector)
platform/orchestrator→ pipeline runner + scheduler + offline replay + bake-off
platform/evals       → cross-provider rubric + scoring
providers/claude     → Anthropic adapter (messages.parse + zodOutputFormat)
providers/grok       → xAI adapter (OpenAI-compatible, chat.completions.parse)
providers/sol        → OpenAI adapter (Responses API, responses.parse)
portal               → Next.js 16 dashboard (RBAC, drill-down, Recharts, chat)
```

## Read the plan

| Doc | What |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | The master architecture + data flow |
| [docs/AGENT-FLEET.md](docs/AGENT-FLEET.md) | The fleet, how an agent is built, the growth recipe |
| [docs/DATA-CONTRACTS.md](docs/DATA-CONTRACTS.md) | The artifact schemas (the crux) |
| [docs/PROVIDER-COMPARISON.md](docs/PROVIDER-COMPARISON.md) | How the Claude/Grok/Sol bake-off works |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased execution plan + status |
| [docs/adr/](docs/adr/) | Key decisions (shared spine, TS monorepo, artifact handoffs) |

## Status

The platform is real and runnable: full Zod-4 contracts, the shared six-agent
fleet, three working provider adapters with genuine structured outputs, an
executable bake-off, a live Azure connector (read-only), a Next.js 16 dashboard,
and a passing test suite + CI. Everything above runs offline with no credentials;
add API keys for live runs. See the roadmap for what's next (live-tenant runs,
LLM-judge for report quality, and expanding the fleet).
