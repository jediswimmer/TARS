# @tars/portal — Customer Portal & Dashboard

The presentation layer of TARS. It renders fleet output for the customer, gated
by RBAC, and hosts the interactive main dashboard.

> **Preview it now:** open [`mockup/dashboard.html`](./mockup/dashboard.html) in a
> browser. It's a self-contained, buildless mockup of the target dashboard —
> infographic KPIs, a checkbox-driven notification list, and a live drill-down
> panel with a hero visualization. No install required.

## What it consumes

The portal never re-derives anything — it renders artifacts the fleet already
produced, using the shared `@tars/contracts` types:

| Surface | Artifact(s) | Notes |
|---|---|---|
| Executive dashboard | `executive_view`, `notifications` | Business-owner POV; risk, cost, compliance standing |
| Technical dashboard | `technical_view`, `reviewed_findings` | VP/IT-Director POV; full detail + control mappings |
| Notification feed | `notifications` | Each item is a checkbox row; `visibleToRoles` gates it |
| Customer-service chat | (live) `CustomerServiceAgent` | RBAC-scoped retrieval over the customer's artifacts |

## RBAC

Every view is gated by the viewer's `Role` and its `Purview` (see
`platform/contracts/src/rbac.ts`). A `business_owner` and a `security_analyst`
loading the same page get different slices: the analyst sees raw evidence and
exploit narratives; the owner sees business impact and compliance standing.
`Notification.visibleToRoles` (stamped by the notification agent) is the gate for
each feed row, so the portal only has to filter, never to decide.

## The main dashboard (design)

1. **Infographic header** — KPI tiles from the active view's `headlineMetrics`,
   colored by `intent` (positive/negative/neutral), never by raw direction.
2. **Notification list** — priority-ordered, scrollable; each row has a checkbox.
3. **Drill-down** — checking one or more rows builds a live panel: a **hero**
   visualization (from the highest-priority selected item's `VizSpec`) with
   detailed messaging below. This is the interaction the mockup demonstrates.
4. **Priority organization** — the list and the drill-down are ordered by
   `Notification.priority` / `VizSpec.priority` (1 = hero slot).

## Intended stack (Phase 3)

Next.js (App Router) · React · Tailwind + shadcn/ui · Recharts/visx for charts ·
NextAuth (or the MSP's IdP) for role resolution. It reads artifacts from the
same `ArtifactStore` the orchestrator writes to (filesystem in dev, Postgres/Blob
in prod). Charts follow the `dataviz` design-system conventions.
