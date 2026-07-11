# Product

## Register

product

## Users

- **MSP customer stakeholders**, in four RBAC roles the portal already models: Business Owner (risk, cost, and compliance standing — no raw exploit detail), VP / IT Director, Security Analyst (everything, including raw evidence), and Auditor. Context: reviewing what the TARS agent fleet found in their environment overnight, deciding what to act on this week, and asking role-scoped questions in chat.
- **MSP staff (Dynapt) running demos** — including the Claude/Grok/Sol bake-off. The portal doubles as the sales-facing proof of what the fleet does; prospects will judge the MSP by this screen.
- Job to be done: *understand my current risk in seconds, know exactly what to do this week, drill into evidence when my role permits — and come away trusting the MSP more because of how clearly it was presented.*

Note on register: intent is **split**. The dashboard (today's entire surface) is product register; a marketing/landing surface is planned and matters — treat it as brand register per task when it arrives.

## Product Purpose

TARS is an MSP's agent-fleet platform — narrowly-scoped scheduled agents that each own one job and hand typed artifacts down a pipeline. The portal is the customer-facing window onto what the fleet found: Azure security today, every facet of the customer environment over time. Success looks like: a Business Owner grasps their posture in ten seconds, an analyst reaches full evidence with zero friction, and a prospect watching the demo says "I want that."

## Brand Personality

**Mission-control calm** — tactical, precise, authoritative. The TARS name sets the tone: advanced systems competence, composure under alert conditions. Serious about severity without alarm fatigue; confidence, not panic. Three words: **precise, composed, advanced**.

## Anti-references

- **The AI-generated SaaS admin template** — cream/gray identical-card grids, tracked-uppercase eyebrows, the default admin-panel look that is now everywhere and produces AI fatigue. TARS must read as visibly fresher than that.
- **Enterprise-dated UI** — SharePoint-era chrome, gray-on-gray density, 2010s admin styling.
- Explicitly **NOT** anti-references (wanted, executed exceptionally rather than avoided): hero metrics, richly visualized alerts, illustration, fintech-grade styling. The brief is a beautiful, deliberate blend of these — fresh, never templated. (Scott: "This should be something that looks fresh, newer than MOST SaaS AI-generated admin panels that now feel overly used and exhausting.")

## Design Principles

1. **Calm authority** — severity is communicated with precision and restraint. Critical findings feel grave, not shrill; the interface never manufactures panic to seem important.
2. **Fresh over familiar** — when a pattern is the obvious template move, find the better one. Hero metrics and visualized alerts are welcome; their generic renditions are not.
3. **Role-shaped, not role-filtered** — RBAC is the product's core idea. Each role's view should feel designed for that person, not like the analyst view with rows hidden.
4. **Evidence within reach** — every claim on screen can be drilled to its artifact. Summary for the owner, receipts for the analyst, one gesture apart.
5. **The portal sells the MSP** — demo-grade polish is a functional requirement, not vanity. Every screen may be the moment a prospect decides.

## Accessibility & Inclusion

Best-effort (no formal WCAG gate yet): fix obvious contrast failures, don't encode severity in color alone (pair with text/icon), keep keyboard operability on interactive controls as they're built. Revisit as a formal AA pass if enterprise customers require it.
