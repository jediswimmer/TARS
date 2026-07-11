# The Provider Bake-Off

The point of three provider folders is a fair, repeatable comparison of Claude,
Grok, and Sol building the *same* fleet. This document is how we keep it honest.

## What varies, what doesn't

| Held identical (the spine) | Varies (the experiment) |
|---|---|
| Azure connectors + the input snapshot | The LLM behind the `LlmProvider` port |
| Artifact schemas (`@tars/contracts`) | The system prompts (tuned per model) |
| Orchestrator + pipeline definition | The vendor SDK adapter |
| Eval harness + rubric | — |
| Portal / dashboard | — |

Because only the right-hand column changes, differences in the output artifacts
are attributable to the model (and its prompting), not to divergent plumbing.

## Two comparison modes

1. **Pure model comparison** — same prompts, swap only the adapter. Isolates raw
   model capability. Start here.
2. **Whole-approach comparison** — let each provider folder tune its own prompts
   (and, later, its own agent decomposition) to get the best out of that model.
   Measures "best achievable per vendor". This is why prompts live in the
   provider folders, not the spine.

## Running it

```bash
pnpm bakeoff                              # offline fixture + canned LLM (no keys)
TARS_MODE=live pnpm bakeoff               # real models; Claude judges reportQuality
BAKEOFF_PROVIDERS=claude,sol pnpm bakeoff # subset of providers
```

Under the hood:

```
# same pipeline, three providers, identical Contoso fixture
runPipeline(AZURE_SECURITY_PIPELINE, { provider: "claude", … })
runPipeline(AZURE_SECURITY_PIPELINE, { provider: "grok",   … })
runPipeline(AZURE_SECURITY_PIPELINE, { provider: "sol",    … })

# then score + rank (golden baseline + optional LLM judge)
compareRuns([claudeRun, grokRun, solRun], { baseline: CONTOSO_GOLDEN, judgeScores })
```

Published outputs land in `runs/bakeoff/`:

| File | Contents |
|---|---|
| `<timestamp>-ranking.json` | Raw `RunScore[]`, mode, providers, baseline, judge model |
| `<timestamp>-report.md` | Head-to-head ranking table, dimension breakdown, caveats |

Offline mode uses neutral `reportQuality` scores (0.5) so the bake-off stays
credential-free. Live mode calls a blinded Claude judge over each provider's
`security_report` excerpt; when Claude is also a contestant, treat that dimension
as a known fairness caveat (labels are blinded, judge family matches one entry).

## The rubric (`@tars/evals`)

| Dimension | Weight | Source |
|---|---|---|
| Finding coverage vs. baseline | 0.25 | structural |
| Low false-positive rate | 0.20 | structural (from reviewer output) |
| Severity accuracy vs. baseline | 0.15 | structural (per-finding: 1.0 / 0.5 / 0.0) |
| Report clarity & usefulness | 0.20 | neutral LLM judge (`judgeReportQuality`) |
| Cost efficiency | 0.10 | structural (from `usage.costUsd`) |
| Latency | 0.10 | structural (from `usage.latencyMs`) |

Structural dimensions are computed from the artifacts + the `LlmUsage` stamped on
every model call. `reportQuality` uses an **LLM-as-judge** (`judgeReportQuality`
in `@tars/evals`) with an injected `complete` callback; the bake-off wires Claude
and passes the resulting `judgeScores` into `compareRuns`.

Cost and latency are normalized relative to the best run in the set (cheapest /
fastest = 1.0). The composite is the weighted sum; `compareRuns` returns the
ranking.

The Contoso ground truth lives in
`platform/evals/src/fixtures/contoso-golden.json` and is exported as
`CONTOSO_GOLDEN`.

## Fairness rules

- **Same input.** All three scan the identical recorded snapshot (or the same
  live capture), so coverage is measured against one ground truth.
- **Same output contract.** Structured output forces every provider into the
  same schema, so we compare content, not formatting.
- **Report the caveats.** If a provider's fleet is only partially ported, or a
  run is sampled/capped, `log()` it — a partial run must never read as a
  complete one.
- **Blind the judge.** The `reportQuality` judge sees the reports without
  provider labels.

## The three adapters (all implemented)

The agents are shared (`@tars/agents`); each provider is a thin adapter that
implements `LlmProvider.complete()` with that vendor's structured-output API and
registers the shared fleet under its name:

- **Claude** — Anthropic SDK `messages.parse` + `zodOutputFormat`, adaptive thinking.
- **Grok (xAI)** — `openai` client at `baseURL https://api.x.ai/v1` (`XAI_API_KEY`),
  `chat.completions.parse` + `zodResponseFormat`.
- **Sol (OpenAI)** — `openai` client, Responses API `responses.parse` + `zodTextFormat`.

Per-model prompt tuning is the "whole-approach" arm: pass a `FleetPrompts` override
into `registerAzureFleet(registry, provider, prompts)` (or the provider's
`register…Fleet`) without touching the shared agent logic.
