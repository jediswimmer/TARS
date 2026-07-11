# Data Contracts

The artifact schemas are the crux of the whole system — the shared vocabulary
that lets agents compose, providers be compared, and the portal render without
re-deriving anything. They live in `@tars/contracts` and are defined once with
Zod (runtime validation for LLM output + inferred TypeScript types).

## The envelope

Every artifact shares one envelope (`artifact.ts`):

```
id, kind, schemaVersion, customerId, runId,
producedBy: { agentId, provider, model },   // provenance — powers the bake-off + audit
createdAt, inputs: string[],                 // lineage — the ids this was derived from
body                                         // kind-specific, below
```

`ArtifactKind` ∈ `scan_findings · reviewed_findings · security_report ·
executive_view · technical_view · notifications`.

## Bodies (one per kind)

| Kind | Body highlights | Produced by |
|---|---|---|
| `scan_findings` | `scope`, `summary.bySeverity`, `findings[]` — each with severity, confidence, category, `resource`, `evidence`, `attackNarrative`, framework refs | Scanner |
| `reviewed_findings` | `overallRiskScore`, `postureSummary`, `reviews[]` — validated/falsePositive, riskScore, likelihood, businessImpact, exploitability, `remediation` | Reviewer |
| `security_report` | `executiveSummary`, `riskPosture`, `keyFindings[]`, `remediationRoadmap[]`, `complianceMapping[]`, Markdown `sections[]` | Report Author |
| `executive_view` / `technical_view` | `narrative`, `headlineMetrics[]` (with `intent`), `visualizations[]` (`VizSpec`, priority 1 = hero), `callouts[]` | View agents |
| `notifications` | `items[]` — priority 0–100, severity, `visibleToRoles[]` (RBAC gate), category, `sourceArtifactId` | Notification agent |

## Cross-cutting vocabularies

- **Severity** (`severity.ts`) — one enum end-to-end (`critical…info`) with sort
  weights, so "high" means the same thing from scanner to dashboard.
- **Frameworks** (`frameworks.ts`) — `MCSB`, `CIS_AZURE`, `MITRE_ATTACK`,
  `NIST_CSF`, `ISO_27001`, `SOC2`, `PCI_DSS`, `SOX`. Findings map to controls;
  the report's compliance rollup is computed from them.
- **RBAC** (`rbac.ts`) — `Role` + `Purview` (min severity, may-see-raw-evidence,
  may-see-business-impact, may-see-compliance-detail). The single source of
  truth the customer-service and notification agents both read.

## Ports (interfaces, not implementations)

Contracts also defines the seams, as pure interfaces (no SDKs):

- `LlmProvider` — `complete({ system, messages, schema? }) → { text, parsed?, usage }`.
  The one interface each vendor implements.
- `ArtifactStore` — `put / get / latest / list`. Filesystem in dev, DB in prod.
- `Agent` / `AgentContext` / `AgentResult` — the behavioral contract the
  orchestrator sees.

## Why Zod

A structured-output LLM call passes the Zod schema straight through to the
provider (`messages.parse` + `zodOutputFormat` on Claude), so the model is
*forced* to return a valid body and we get a typed object back — no parsing, no
drift between "what the model said" and "what the type says".
