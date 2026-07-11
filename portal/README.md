# @tars/portal — Customer Portal & Dashboard

The presentation layer of TARS: a **Next.js 16** (App Router, React 19, Tailwind 4,
Recharts) dashboard that renders fleet output for the customer, gated by RBAC.

```bash
pnpm --filter @tars/portal dev     # http://localhost:3000  (or: pnpm portal)
pnpm --filter @tars/portal build   # production build
```

The dashboard runs with bundled sample data, so it works with no backend. The
customer-service chat route (`app/api/chat`) answers live when `ANTHROPIC_API_KEY`
is set, and returns a demo message otherwise — either way the retrieval is
RBAC-scoped before the model sees anything.

> A static, buildless preview also lives at [`mockup/dashboard.html`](./mockup/dashboard.html).

## What's here

| Surface | File | Notes |
|---|---|---|
| Dashboard shell | `components/Dashboard.tsx` | Role switch, exec/technical toggle, KPI tiles, notification list, drill-down |
| Charts | `components/Charts.tsx` | Recharts severity donut + risk gauge |
| Chat | `components/Chat.tsx` + `app/api/chat/route.ts` | RBAC-scoped customer-service chat |
| Sample data | `lib/sample.ts` | Typed by `@tars/contracts` |

## RBAC

Every view is gated by the viewer's `Role` and its `Purview`. A `business_owner`
and a `security_analyst` loading the same page get different slices: the analyst
sees raw evidence and exploit narratives; the owner sees business impact and
compliance standing. `Notification.visibleToRoles` (stamped by the notification
agent) is the gate for each feed row.

## The main dashboard

1. **Infographic header** — KPI tiles colored by `intent` (not raw direction).
2. **Notification list** — priority-ordered, scrollable; each row has a checkbox.
3. **Drill-down** — checking rows builds a live panel: a hero visualization from
   the highest-priority selection, with detail below.

## Boundary note

The portal consumes `@tars/contracts` **type-only** — nothing from the workspace
is bundled at runtime. In production the chat route proxies to the agent backend;
here it runs the same RBAC-scoped logic locally against sample artifacts. This
keeps the frontend deployable independently of the agent platform.

## Next (Phase 3)

Real IdP for role resolution (NextAuth / the MSP's IdP), a persistent
`ArtifactStore` (Postgres/Blob) in place of the sample data, and multi-customer
routing.
