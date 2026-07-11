---
name: TARS Portal
description: MSP security dashboard — mission-control calm for the TARS agent fleet's findings
colors:
  signal-blue: "#3b82f6"
  signal-blue-night: "#5b9dff"
  alarm-red: "#e5484d"
  caution-orange: "#f76808"
  advisory-amber: "#ffb224"
  nominal-green: "#46a758"
  standby-gray: "#8b8d98"
  ambient-gray: "#f6f7f9"
  panel-white: "#ffffff"
  console-ink: "#17191c"
  telemetry-gray: "#6b7280"
  hairline: "#e6e8ec"
  mission-night: "#0d1016"
  instrument-graphite: "#151a21"
  phosphor-white: "#e6e8ec"
  dimmed-telemetry: "#9aa1ac"
  hairline-night: "#242a33"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.11
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: "0.025em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  kpi-tile:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.console-ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  pill-severity:
    backgroundColor: "{colors.alarm-red}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "2px 6px"
  panel:
    backgroundColor: "{colors.panel-white}"
    textColor: "{colors.console-ink}"
    rounded: "{rounded.xl}"
  button-role:
    backgroundColor: "#00000000"
    textColor: "{colors.console-ink}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-role-active:
    backgroundColor: "{colors.signal-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-view:
    backgroundColor: "#00000000"
    textColor: "{colors.console-ink}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input-chat:
    backgroundColor: "{colors.ambient-gray}"
    textColor: "{colors.console-ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  chat-bubble-user:
    backgroundColor: "{colors.signal-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
  chat-bubble-agent:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.console-ink}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
---

# Design System: TARS Portal

## 1. Overview

**Creative North Star: "The Flight Director's Console"**

TARS is the customer-facing window onto an MSP agent fleet, and its interface is built to feel like the room where launches are run: dark instrument surfaces, luminous data, and absolute composure under critical alerts. Severity is met with procedure, not panic. A live tenant-takeover finding gets an alarm-red pill, a priority numeral, and precise language — never a flashing banner. The brand personality is mission-control calm: **precise, composed, advanced**.

The system as coded today is a competent, austere instrument panel: OS-adaptive light/dark surfaces, one hairline-bordered card recipe, five reserved severity hues, system-stack typography, and numbers as the largest objects on every screen. Several pieces are explicit placeholders awaiting the redesign — the stock Tailwind accent, the unbranded font stack, the near-flat elevation — and this document marks each of them honestly, separating what *is* from what is *committed to come*.

What the system rejects is the default: the AI-generated SaaS admin template (cream/gray identical-card grids, tracked-uppercase eyebrows) and enterprise-dated, SharePoint-era chrome. Hero metrics, richly visualized alerts, illustration, and fintech-grade styling are *not* rejected — they are wanted, and must be executed exceptionally rather than avoided.

Layout is a centered ops shell: content capped at 1152px (`max-w-6xl`) with 24px page padding; a four-across KPI strip; then a two-column console — a fixed 360px notification feed beside a fluid drill-down stage — collapsing to a single column below 768px. Density is moderate: enough rows to feel like telemetry, enough air to stay readable at a glance.

**Key Characteristics:**
- OS-adaptive dual theme; the dark theme (mission night → instrument graphite) is the console's true register.
- Numbers are the heroes — the biggest type on any screen is a metric, a priority, or a risk score.
- A five-hue severity ladder, always pill-labeled with text, never encoded in color alone.
- One card recipe everywhere: panel surface, 1px hairline, whisper shadow (none in dark).
- Composure under alarm: severity escalates precision, never volume.
- Deliberate placeholder debt (accent, typeface, elevation) flagged for the coming redesign.

### Named Rules
**The Composure Rule.** Severity is answered with procedure, not panic. A critical finding gets exact language, an alarm-red pill, and a priority number — it is never given flashing, pulsing, oversized, or shouting treatment. If a screen looks alarmed, it is wrong; the console is alarmed *for* you.

## 2. Colors

A restrained instrument palette: cool neutral surfaces in both themes, a five-hue semantic severity ladder that does all the signaling, and one (admittedly borrowed) blue accent for interaction.

### Primary
- **Stock Signal Blue (placeholder)** (`#3b82f6`, token `signal-blue`): the interactive accent — active role/view buttons, checkbox accent, chat send button, user chat bubbles. This is stock Tailwind blue-500, documented honestly as placeholder-generic: it is **not a brand decision** and is explicitly marked for replacement in the coming redesign. Treat it as scaffolding.
- **Signal Blue, Night** (`#5b9dff`, token `signal-blue-night`): the dark-mode value of `--accent` — lifted for contrast against instrument graphite. Same placeholder status.

### Semantic: The Severity Ladder
These five hues are the product's voice. They come straight from `--color-*` in `globals.css` and are identical in light and dark mode.

- **Alarm Red** (`#e5484d`, token `alarm-red`, CSS `--color-crit`): critical findings. Also aliased as `--color-neg` for negative-intent KPI values.
- **Caution Orange** (`#f76808`, token `caution-orange`, CSS `--color-high`): high findings; also the "coverage below 60%" state on compliance bars.
- **Advisory Amber** (`#ffb224`, token `advisory-amber`, CSS `--color-med`): medium findings.
- **Nominal Green** (`#46a758`, token `nominal-green`, CSS `--color-low`): low findings, healthy compliance fills. Also aliased as `--color-pos` for positive-intent KPI values.
- **Standby Gray** (`#8b8d98`, token `standby-gray`, CSS `--color-info`): informational findings.

### Neutral
Light theme / dark theme pairs, from `:root` and the `prefers-color-scheme: dark` block in `globals.css`:

- **Ambient Gray** (`#f6f7f9`, token `ambient-gray`) / **Mission Night** (`#0d1016`, token `mission-night`): the page background (`--bg`). Also the chat input's fill.
- **Panel White** (`#ffffff`, token `panel-white`) / **Instrument Graphite** (`#151a21`, token `instrument-graphite`): every card and panel surface (`--panel`).
- **Console Ink** (`#17191c`, token `console-ink`) / **Phosphor White** (`#e6e8ec`, token `phosphor-white`): primary text (`--ink`). In the dark theme, text is the luminous element on the instrument surface.
- **Telemetry Gray** (`#6b7280`, token `telemetry-gray`) / **Dimmed Telemetry** (`#9aa1ac`, token `dimmed-telemetry`): secondary text (`--muted`) — labels, metadata, captions, units.
- **Hairline** (`#e6e8ec`, token `hairline`) / **Hairline Night** (`#242a33`, token `hairline-night`): all borders and dividers (`--line`); also the neutral track of progress bars and gauges, and agent chat bubbles.

Note: the static mockup (`portal/mockup/dashboard.html`) carries slightly drifted neutrals (`#f7f8fa`, `#1a1d21`, `#0e1116`, `#161a21`, `#262b34`); `globals.css` is normative.

### Named Rules
**The Severity Is Sacred Rule.** Alarm red, caution orange, advisory amber, nominal green, and standby gray belong exclusively to severity, intent, and compliance state. They never decorate. If a color signals, nothing else on the screen may wear it.

**The Placeholder Accent Rule.** `#3b82f6` is a stopgap, not an identity. Do not deepen its footprint — no new gradients, illustrations, or brand surfaces built on it. Every use should be trivially swappable the day the real accent lands.

**The Never Color Alone Rule.** Severity is always paired with its uppercase text label (the pill). Color-only severity encoding is prohibited — this is an accessibility commitment from PRODUCT.md, not a preference.

## 3. Typography

**Display Font:** system stack — Tailwind v4 default `--font-sans`: `ui-sans-serif, system-ui, sans-serif` plus the emoji fallbacks `'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'` (fallbacks elided in the frontmatter tokens; no custom font is loaded)
**Body Font:** same system stack
**Label/Mono Font:** none distinct. Tabular numerals are honestly partial today: in code only the feed P-score and the compliance percentages are set `tabular-nums`; the KPI values, the 36px hero priority, the donut total, and the gauge score all update and are *not* yet tabular — the Tabular Discipline Rule's outstanding debt

**Character:** currently anonymous-competent — the unbranded system default, set tight and heavy for numbers, small and quiet for labels. Like the accent, the typeface is an acknowledged placeholder: a distinctive instrument-grade voice is expected from the redesign. The *hierarchy*, however, is deliberate and should survive any font swap.

### Hierarchy
- **Display** (700, 2.25rem/36px, line-height 2.5rem): the drill-down hero priority numeral ("96/100"). Chart centers run one step down (700, 1.875rem/30px, line-height 1). The largest thing on screen is always a number.
- **Headline** (700, 1.5rem/24px, line-height 2rem): KPI tile values, tinted by intent (alarm red negative, nominal green positive).
- **Title** (600, 1.125rem/18px): panel headings ("Environment risk overview") and drill-down finding titles. The brand lockup in the header runs 700 at 1.25rem/20px with tight tracking (-0.025em).
- **Body** (400, 0.875rem/14px, line-height 1.43): the workhorse — summaries, buttons, compliance rows, chat. Un-classed row titles inherit 1rem/16px at weight 600; the narrative block runs 15px with relaxed 1.625 leading.
- **Label** (400, 0.75rem/12px, letter-spacing 0.025em, UPPERCASE, telemetry gray): section headers, KPI labels, "Viewing as". Honesty note: this is exactly the tracked-uppercase eyebrow that PRODUCT.md names as an AI-template signature — it is current reality and on the replacement list. The severity pill runs 700 at 10px, uppercase, same tracking.

### Named Rules
**The Numerals Carry the Room Rule.** Data outranks headings. The visual hierarchy inverts the typical admin panel: headings are small, muted, uppercase furniture; the numbers they label are the largest, heaviest objects on screen. Never let a heading outweigh its metric.

**The Tabular Discipline Rule.** Any numeral that can change — priorities, percentages, counts — is set in `tabular-nums`. Jumping digits are prohibited on an instrument panel.

## 4. Elevation

Current reality is nearly flat, and this is stated truthfully: light mode carries exactly one shadow token — a two-layer whisper under every card — and dark mode carries **none** (`--shadow: none`). In the dark theme, all separation is done by surface steps (mission night `#0d1016` page → instrument graphite `#151a21` panel) and 1px hairlines. That is tonal layering, and today it is the entire depth system.

The committed direction is a doctrine, not yet code: **layered luminous**. Depth in the redesign will come from a glow-and-depth vocabulary — data surfaces lit from within, luminance separating layers the way light separates instruments in a dark control room — rather than from drop shadows. Until that system lands, do not freelance new shadows; the current flatness is the baseline, the doctrine below is the destination.

### Shadow Vocabulary (if applicable)
- **Card whisper** (`box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.1)`): the only shadow in the system; applied to every `.card` in light mode. Barely-there lift off ambient gray.
- **Lights out** (`box-shadow: none`): the dark-mode value. Depth is tonal, not cast.

### Named Rules
**The Lights-Out Rule.** In dark mode, shadows are dead. Separation is carried entirely by surface steps and hairlines. Do not add drop shadows to dark surfaces — a glowing shadow under a dark card is 2014.

**The Layered Luminous Rule.** *(Direction, not current code.)* When depth arrives, it arrives as light: inner luminance, edge glow, and layered surface tones — data surfaces lit from within. Drop-shadow stacking is not the future of this system.

## 5. Components

Component philosophy — the destination is **confident and tactile**: bolder presence, satisfying weight, fintech-grade finish. The current components are more austere than that ambition — flat fills, minimal states, one hover idiom — and the gap is acknowledged and scheduled. What exists is documented exactly below.

### Buttons
- **Shape:** gently rounded; view-toggle buttons 6px (`rounded-md`), role-switcher and chat buttons 8px (`rounded-lg`).
- **Primary (chat "Ask"):** signal blue fill, white text, 600 weight, 8px 16px padding. Disabled state drops to 50% opacity.
- **Selected state (role/view):** active buttons fill with signal blue and flip to white text; inactive buttons are transparent with a 1px hairline border and ink text.
- **Hover / Focus:** honestly minimal today — buttons define no hover or focus treatment in code (the only hover idiom in the app is the row wash, `rgba(0,0,0,0.03)` light / `rgba(255,255,255,0.04)` dark). This is a known austerity gap against the confident-and-tactile direction.

### Pills (severity chips)
- **Style:** fully rounded (`9999px`), severity-colored fill from the ladder, white uppercase text at 10px/700 with 0.025em tracking, 2px 6px padding.
- **Role:** the atomic severity signal — appears in feed rows, the drill-down header, and stacked finding cards. Always carries the severity word; see The Never Color Alone Rule.

### Cards / Containers
- **Corner Style:** 12px (`rounded-xl`) for KPI tiles, role switcher, and the narrative block; 16px (`rounded-2xl`) for the two major panels and chat; 8px (`rounded-lg`) for nested finding cards inside the drill-down.
- **Background:** panel white / instrument graphite (`--panel`).
- **Shadow Strategy:** the card whisper in light mode, lights-out in dark (see Elevation).
- **Border:** always 1px solid hairline (`--line`). Every container is the same `.card` recipe.
- **Internal Padding:** 16px standard (`p-4`); 20px in the drill-down stage (`p-5`); 8px on the compact role-switcher bar (`p-2`).

### Inputs / Fields
- **Style:** the chat input is a 1px hairline-bordered field, 8px radius, filled with the *page* background (ambient gray / mission night) so it reads recessed into the panel; 14px text, 8px 12px padding.
- **Checkbox:** native 16px checkbox tinted via `accent-color: var(--accent)` — the feed's selection mechanism.
- **Focus:** none defined in code today (browser default outline only). Another flagged austerity gap.
- **Error / Disabled:** only the Ask button's `disabled:opacity-50`.

### Navigation
- The header is the navigation: brand lockup (TARS, 20px/700, tight tracking) with a muted 14px (`text-sm`) subtitle and tenant line, and a right-aligned executive/technical view toggle. Below it, the **role switcher bar** — a compact card of RBAC role buttons ("Viewing as") — acts as the portal's primary mode control; the selected role reshapes the entire feed. No sidebar, no hamburger; the console is one screen.

### Notification Feed Rows (signature)
Priority-ordered telemetry rows inside the 360px feed panel: checkbox (accent-tinted), 600-weight title, and a metadata line of severity pill + category + right-aligned `P{n}` priority in bold tabular numerals. 1px hairline row dividers, 12px 16px padding, and the system's one hover state — a 3-4% wash. Checking rows composes the drill-down.

### Drill-Down Panel (signature)
The console's stage. Empty state shows the environment overview: severity donut + risk gauge + compliance bars side by side with a hint line. With selections, the highest-priority finding becomes the hero — pill + 18px title, a 36px priority numeral over a 208px severity-colored progress bar on a hairline track, then the summary above a hairline rule, with further selections stacked as 8px-radius sub-cards.

### Compliance Progress Bars
Per-framework rows (MCSB, SOC2, SOX): 14px label with right-aligned tabular percentage, over a 6px fully-rounded hairline track. Fill is nominal green at ≥60% coverage, caution orange below — a severity-ladder judgment, not decoration.

### Charts (signature): SeverityDonut + RiskGauge
Recharts, styled entirely from the token sheet. The **donut** (168px, ring from radius 54 to 78, 2° padding between slices, no stroke) maps findings to severity-ladder fills with a bold count and muted "findings" caption dead-center. The **gauge** is a 260° radial arc (220° to -40°) on a hairline track, 8px corner rounding, whose fill color *is* the risk verdict: ≥80 alarm red, ≥60 caution orange, ≥40 advisory amber, else nominal green — centered bold score over "risk /100". Charts are instruments, not illustrations: no gradients, no 3D, no legend chrome at all (a swatch legend appears only in the static mockup, not the coded components).

### Chat Widget
A collapsed card bar ("Customer service · answers scoped to your role") that expands to a scrolling message column — user bubbles in signal blue/white on the right, agent bubbles on hairline fill on the left, both 16px-radius — above the input + Ask button row. RBAC is visible in the copy, not just the plumbing.

### Named Rules
**The One Card Voice Rule.** Every container in the portal is the same `.card` recipe — panel surface, 1px hairline, whisper shadow (none in dark). No component invents its own container treatment. One voice, many instruments.

**The Fintech Finish Rule.** *(Direction, not current code.)* Components are headed toward confident and tactile — bolder presence, satisfying weight, fintech-grade finish. New components should close that gap deliberately; copying today's austerity forward is not fidelity, it is stagnation.

## 6. Do's and Don'ts

Guardrails carry PRODUCT.md's strategic line into every screen. Note first what is explicitly **wanted, not banned**: PRODUCT.md states that hero metrics, richly visualized alerts, illustration, and fintech-grade styling are "Explicitly NOT anti-references (wanted, executed exceptionally rather than avoided)." Build them — exceptionally.

### Do:
- **Do** make numbers the heroes: hero metrics are wanted. The largest type on screen is a metric (24px+ / 700), its label small, muted, and beneath it in importance.
- **Do** pair every severity color with its uppercase text pill — alarm red `#e5484d`, caution orange `#f76808`, advisory amber `#ffb224`, nominal green `#46a758`, standby gray `#8b8d98` — never color alone.
- **Do** route every container through the one `.card` recipe: `--panel` surface, 1px `--line` border, `--shadow` (whisper in light, none in dark).
- **Do** build richly visualized alerts, illustration, and fintech-grade styling — these are explicitly wanted per PRODUCT.md; execute them exceptionally rather than avoiding them.
- **Do** set every mutable numeral in `tabular-nums`, and keep dark mode shadowless until the layered-luminous system lands — depth via surface steps (`#0d1016` → `#151a21`) and hairlines.
- **Do** treat `#3b82f6` as disposable scaffolding: use it only where the accent already appears, so the real brand accent can replace it in one sweep.

### Don't:
- **Don't** ship "the AI-generated SaaS admin template — cream/gray identical-card grids, tracked-uppercase eyebrows, the default admin-panel look that is now everywhere and produces AI fatigue" (PRODUCT.md, verbatim). Scott's brief: "This should be something that looks fresh, newer than MOST SaaS AI-generated admin panels that now feel overly used and exhausting." Audit test: if a screenshot could be any AI-generated admin panel, it fails. (Honesty: today's identical KPI grid and tracked-uppercase labels *are* this pattern — known debt, first against the wall in the redesign.)
- **Don't** ship "enterprise-dated UI — SharePoint-era chrome, gray-on-gray density, 2010s admin styling" (PRODUCT.md, verbatim).
- **Don't** deepen the placeholder accent's footprint — no gradients, brand moments, or illustrations built on stock Tailwind blue-500.
- **Don't** manufacture panic: no flashing, pulsing, oversized, or animated alarm treatments. Severity escalates precision, never volume (The Composure Rule).
- **Don't** use the severity hues for anything but severity, intent, and compliance state — and never encode severity in color alone.
- **Don't** invent per-component shadows, border weights, or container styles; and don't add drop shadows to dark surfaces — lights out means lights out.
