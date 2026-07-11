# 010 — Azure Depth (F1) · the first executable workstream

## Facet & goal
**Facet F1 — Azure posture.** TARS already scans Azure, but the coverage is thin:
Defender is a boolean `PolicyState`, there's no Conditional Access, no PIM / role
eligibility, no credential-expiry or patch/vulnerability signal, and the exposure
"topology" is faked in the canned run. This loop **deepens F1 across 7 slices** and,
in slice 0, lays the **S1 platform seams** (CLI flags + Zod snapshot) that make
"is Azure complete?" a testable schema question and unblock live validation against
Dynapt's tenant. Ships depth-first, one PR per slice, zero-behaviour-change first.

## Repo orientation
*(the 10-line version — see `000-overview.md` for the same block)*

TARS is a pnpm monorepo. An MSP runs a **fleet of small, single-purpose, scheduled
agents**; **artifacts are the handoff currency**. Packages: `platform/contracts`
(Zod spine), `platform/core` (`BaseAgent`, `FileArtifactStore`, registry),
`platform/agents` (the fleet), `platform/connectors` (Azure today),
`platform/orchestrator` (`run.ts`, `pipeline.ts`, fixtures, bake-off, scheduler),
`platform/evals`, `providers/{claude,grok,sol}`, `portal`. An agent extends
`BaseAgent<Body>`, is described by an `AgentDefinition`
(`platform/contracts/src/agent.ts`), and implements `produce(ctx)` touching only
`ctx.llm`, its inputs, and its output body. The pipeline
(`platform/orchestrator/src/pipeline.ts`) is an implicit DAG resolved via
`store.latest(kind, customerId)`. `TARS_MODE=offline` replays
`CANNED_CLAUDE_RUN`; `makeAzureConnector(mode, creds)`
(`platform/connectors/src/azure/client.ts`) picks `FixtureAzureConnector` (offline)
or `LiveAzureConnector` (live).

## Commands
```bash
pnpm install
pnpm -r typecheck
pnpm test
pnpm demo
pnpm pipeline:azure
```

## Guardrails
1. Connectors are **read-only** (read-only SP / least-privilege Graph scope).
2. **Secrets never land in artifacts or fixtures** — posture only, scrub creds.
3. **Reviewer gate** before any customer-facing output.
4. **Demo-coherence rule:** every fixture change keeps `contoso-financial.json`
   schema-valid, **regenerates** `canned-claude-run.ts`, keeps `portal/lib/sample.ts`
   coherent, and adds a **failing AND a passing** exemplar for every new check.

## Growth recipe (verbatim from `docs/AGENT-FLEET.md`)
1. New artifact type → schema in `platform/contracts/src/artifacts/` + add to
   `ArtifactKind` enum.
2. Agent class + default prompt in `platform/agents/src/`.
3. Register in `createAzureFleet()` (`platform/agents/src/fleet.ts`).
4. Add its id to `AZURE_SECURITY_PIPELINE`.

> Most slices here do **not** add an agent — they deepen the **snapshot** the
> scanner already reasons over. Adding snapshot fields needs no new artifact kind;
> the scanner sees richer input and emits richer `azure_scan_findings`.

## Current state (what's there today — cite before you touch)
- **Snapshot is a plain TS interface**, not Zod: `AzureEnvironmentSnapshot` in
  `platform/connectors/src/azure/types.ts` (`tenantId, capturedAt, subscriptions,
  resources, identities, networkExposures, policyStates`). `AzureIdentity.type`
  already includes `"managedIdentity"` (line ~39) but the fixture never emits one.
- **`run.ts` hardcodes the connector**: `new FixtureAzureConnector()`
  (`platform/orchestrator/src/run.ts:28`) and only switches the *LLM* by
  `TARS_MODE`. It also hard-rejects any non-default pipeline
  (`if (pipelineName !== "azure-security") throw`, line 19). Customer id is
  hardcoded `"contoso-financial"`.
- **The factory already exists**: `makeAzureConnector(mode, creds)` and a
  fully-implemented `LiveAzureConnector` (Graph + Resource Graph + Defender) live
  in `platform/connectors/src/azure/client.ts`. Slice 0 wires `run.ts` to it — no
  new connector code.
- **Fixture**: `platform/connectors/src/azure/fixtures/contoso-financial.json` — 7
  resources, 3 identities (admin no-MFA, ci-deployer Owner SP, analyst Reader), 3
  network exposures (3389/22 → jumpbox, 1433 → sql), 3 boolean `policyStates`.
  Every finding today is a true positive (reviewer never rejects anything).
- **Canned run**: `platform/orchestrator/src/fixtures/canned-claude-run.ts` — 3
  scanner findings, 3 reviews (`finding_rdp` 95 ↔ `finding_admin_mfa` 92 mutual;
  `finding_storage` 80). Keyed by each agent's `schemaName`.
- **`vulnerability` category is empty** — no finding uses it today.

---

## Slices (one PR each)

### Slice 0 — Schema hardening + CLI seams (S1) · FIRST, zero behaviour change
The single first PR of the whole fleet effort. Turns the snapshot into a readable,
testable schema and makes the runner customer/connector-parameterized.

1. **Zod snapshot.** In `platform/connectors/src/azure/types.ts`, add a Zod schema
   mirroring the existing interfaces and a `snapshotVersion: z.literal("1.0.0")`
   (or a `z.string()` default) field on `AzureEnvironmentSnapshot`. Keep the
   interfaces as `z.infer` types so no downstream type changes. Export
   `AzureEnvironmentSnapshotSchema`.
2. **Validate on read.** `FixtureAzureConnector.capture()`
   (`client.ts`) parses the JSON through `AzureEnvironmentSnapshotSchema.parse(...)`
   so a malformed fixture fails loudly with a Zod path, not `undefined` deep in the
   scanner.
3. **Add `snapshotVersion` to the fixture** JSON.
4. **CLI seams on `run.ts`.** Parse `--customer`, `--connector=fixture|live`,
   `--mode=offline|live`, `--provider=claude|grok|sol` (fall back to today's
   defaults + `TARS_MODE`). Replace the hardcoded `new FixtureAzureConnector()`
   with `makeAzureConnector(connector === "live" ? "live" : "offline", creds)`
   (read `creds` from `AZURE_*` env only when live). Keep the
   `pipelineName !== "azure-security"` guard for now (the registry replacement is
   S2 in `030`) but source the customer id from the flag.
5. **Fixture-validation test.** Add `tests/snapshot.test.ts`: load the Contoso
   fixture, assert `AzureEnvironmentSnapshotSchema.safeParse(...)` succeeds.

**Acceptance:** `pnpm -r typecheck` + `pnpm test` green; `pnpm demo` artifacts
**diff-identical** to before (prove zero behaviour change); fixture validates;
`pnpm pipeline:azure --customer=contoso-financial` unchanged output.

### Slice 1 — Entra depth: Conditional Access + auth posture
Add an **`entra` sub-snapshot** (named for M365 reuse in `020`): CA policies,
per-user auth methods, legacy-auth exposure. Live query: Graph
`/identity/conditionalAccess/policies` (`Policy.Read.All`) +
`/reports/authenticationMethods/userRegistrationDetails` (already used).
Fixture: add a healthy CA policy AND a gap (e.g. no MFA-for-admins policy → the
finding), plus one **false-positive bait** (a report-only CA policy that looks
disabled but isn't). New scanner prompt section. Regenerate canned run.

### Slice 2 — Defender: Secure Score
Replace the boolean `policyStates` with a real Defender **Secure Score** structure
(score, max, per-control status, assessments). Gives the executive view its hero
KPI. Live: `@azure/arm-security` secure scores + assessments (already wired for
assessments in `client.ts`). Fixture grows a numeric score with a mix of
healthy/unhealthy controls.

### Slice 3 — RBAC sprawl + PIM + managed identities
Resource Graph `authorizationresources` for role assignments at scale; Entra PIM
role **eligibility** (P2). **Emit the never-emitted `managedIdentity`** identity
type. Fixture: add a managed identity and an over-privileged eligible role, plus a
correctly-scoped one (pass exemplar).

### Slice 4 — Credential hygiene
App-registration secret/cert **expiry**, storage-account **key age**. (Defer Key
Vault data-plane secret enumeration — needs data-plane perms.) Fixture: one
expiring secret (fail) + one healthy rotation (pass).

### Slice 5 — Vulnerability / patch feed
Fill the empty `vulnerability` category: Defender for Servers **sub-assessments** +
Update Manager patch compliance. Fixture: a VM missing critical patches (fail) + a
patched VM (pass).

### Slice 6 — Real exposure topology
Public endpoints without a private endpoint; effective VM exposure — the join the
canned run currently fakes. Consumes slices 0–5's richer snapshot. Fixture:
correct the exposure model so the portal topology map (WS1 PR3) renders real edges.

> After the slices, the Contoso fixture carries healthy counterparts + at least one
> false-positive bait per new check, so the reviewer stage visibly rejects
> something (today it's 100% true-positive).

---

## Live-validation gate
Tenant-zero = **Dynapt's own tenant**. Each slice's acceptance adds: *"live capture
succeeds against Dynapt with documented least-privilege grants."*

**Least-privilege grants required across slices (open item for Scott):**
- `Policy.Read.All` (slice 1 — Conditional Access)
- `AuditLog.Read.All` + Entra **P1/P2** (slices 1, 3 — auth methods, PIM)
- `RoleManagement.Read.Directory` (slice 3 — role eligibility)
- Reader on the subscription + Defender for Cloud reader (slices 2, 5)

**Open item:** who runs the live LLM pass that regenerates `canned-claude-run.ts`
after each fixture change (the demo-coherence rule requires it).

## Acceptance criteria (every slice)
- `pnpm -r typecheck` + `pnpm test` green.
- Fixture validates against `AzureEnvironmentSnapshotSchema`.
- New check has **both** a failing and a passing exemplar in Contoso.
- `pnpm demo` tells a coherent story; `canned-claude-run.ts` regenerated.
- Slice 0 only: `pnpm demo` output **diff-identical** to pre-change (zero behaviour
  change).
- Live gate: `pnpm pipeline:azure --connector=live --customer=dynapt` succeeds with
  the documented grants.
