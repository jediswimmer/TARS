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

```
# same pipeline, three providers, identical input
runPipeline(AZURE_SECURITY_PIPELINE, { provider: "claude", … })
runPipeline(AZURE_SECURITY_PIPELINE, { provider: "grok",   … })
runPipeline(AZURE_SECURITY_PIPELINE, { provider: "sol",    … })

# then score + rank
compareRuns([claudeRun, grokRun, solRun], { baseline, judgeScores })
```

## The rubric (`@tars/evals`)

| Dimension | Weight | Source |
|---|---|---|
| Finding coverage vs. baseline | 0.25 | structural |
| Low false-positive rate | 0.20 | structural (from reviewer output) |
| Severity accuracy vs. baseline | 0.15 | structural |
| Report clarity & usefulness | 0.20 | neutral LLM judge |
| Cost efficiency | 0.10 | structural (from `usage.costUsd`) |
| Latency | 0.10 | structural (from `usage.latencyMs`) |

Structural dimensions are computed from the artifacts + the `LlmUsage` stamped on
every model call. `reportQuality` uses an **LLM-as-judge** with a neutral model
(a Phase-2 hook: `compareRuns(..., { judgeScores })`).

Cost and latency are normalized relative to the best run in the set (cheapest /
fastest = 1.0). The composite is the weighted sum; `compareRuns` returns the
ranking.

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

## Porting Grok / Sol

Both are OpenAI-API-compatible surfaces:

- **Grok (xAI):** `openai` client with `baseURL: https://api.x.ai/v1` + `XAI_API_KEY`.
- **Sol (OpenAI):** `openai` client, Responses API + `zodResponseFormat`.

The recipe is in each provider's `src/provider.ts`. Implement `complete()`
against the vendor's structured-output API, copy the Claude agents into the
provider's `agents/` (retarget `provider`), tune the prompts, and register the
fleet. Then it's in the bake-off.
