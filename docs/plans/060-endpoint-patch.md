# 060 — Endpoint / RMM + Patch Compliance (F4)

## Facet & goal
**Facet F4 — endpoint & patch health**, Intune-first (RMM connectors like
NinjaOne/Datto are out of scope until a non-Intune customer needs them). Device
compliance, encryption, EDR presence, and **patch compliance** across the fleet's
endpoints. Adversarial-review shape (some findings are contestable) but lighter
than Azure.

## Orientation, commands, guardrails, recipe
See `000-overview.md`. Guardrails unchanged.

## Depends on
- **`020`** (M365/Intune snapshot + connector — reuses `deviceManagement` data).
- **`010` slice 5** (patch/vulnerability shape — reuse the patch-compliance model).

## Current state
- No endpoint fleet. Intune device data arrives via the M365 connector (`020`).
- Patch-compliance snapshot shape established in `010` slice 5.

## Slices
### Slice 1 — Endpoint snapshot (from Intune)
Extend/reuse the M365 `deviceManagement` snapshot: per-device compliance state,
encryption, EDR, OS patch level. Fixture: a non-compliant unpatched device (fail) +
a healthy device (pass).
### Slice 2 — Endpoint fleet
`endpoint-scanner` → `endpoint-reviewer` → report/notification (reused,
parameterized per S2). New `ArtifactKind`s: `endpoint_scan_findings`,
`endpoint_reviewed_findings`, `endpoint_report`.

## Live-validation gate
Tenant-zero = **Dynapt** Intune. Grants:
`DeviceManagementManagedDevices.Read.All`, `DeviceManagementConfiguration.Read.All`.

## Acceptance criteria
- `pnpm -r typecheck` + `pnpm test` green; fixture validates; fail+pass exemplars;
  reviewer rejects the bait; `pnpm demo`/`pnpm pipeline:endpoint` coherent.
