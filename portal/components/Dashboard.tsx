"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { HeadlineMetric, Notification, Role } from "@tars/contracts";
import {
  COMPLIANCE,
  EXEC_METRICS,
  EXEC_NARRATIVE,
  NOTIFICATIONS,
  RISK_SCORE,
  ROLES,
  SEVERITY_COLOR,
  SEVERITY_COUNTS,
  TECH_METRICS,
  TECH_NARRATIVE,
} from "../lib/sample";
import { BrandMark } from "./BrandMark";
import { RiskGauge, SeverityDonut } from "./Charts";
import { Chat } from "./Chat";

type View = "executive" | "technical";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)";

const transitionFast =
  "transition-[color,background-color,box-shadow,border-color,transform,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)]";

/** Risk score severity — matches Charts.RiskGauge and the Overall Risk KPI. */
function riskSeverityColor(score: number): string {
  if (score >= 75) return "var(--color-crit)";
  if (score >= 60) return "var(--color-high)";
  if (score >= 40) return "var(--color-med)";
  return "var(--color-low)";
}

/**
 * Severity pills: tinted chip (severity color at ~14% alpha + severity text).
 * White-on-filled fails for medium (#ffb224) and is marginal for low/info;
 * tinted style used for ALL severities so contrast and vocabulary stay consistent.
 */
function Pill({ severity }: { severity: Notification["severity"] }) {
  const color = SEVERITY_COLOR[severity];
  return (
    <span
      className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em] uppercase"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      {severity}
    </span>
  );
}

function TelemetryLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`telemetry text-[11px] font-medium tracking-[0.05em] text-(--muted) uppercase ${className}`}>
      {children}
    </span>
  );
}

/** Quarter-gauge arc for Overall Risk — stroked in severity color. */
function RiskArc({ score, color }: { score: number; color: string }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  // Quarter circle (25% of circumference); fill proportion of 0–100 onto that arc.
  const quarter = c * 0.25;
  const filled = quarter * Math.min(100, Math.max(0, score)) / 100;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden className="shrink-0">
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth="3"
        strokeDasharray={`${quarter} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={`${filled} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

/** N severity tick squares — first `filled` use --color-crit. */
function CritTicks({ total, filled }: { total: number; filled: number }) {
  const n = Math.max(total, filled, 1);
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="size-2 rounded-[2px]"
          style={{
            background: i < filled ? "var(--color-crit)" : "var(--line)",
          }}
        />
      ))}
    </div>
  );
}

/** Status dot; critical glow when exposure is active. */
function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className="inline-block size-2.5 rounded-full"
      aria-hidden
      style={{
        background: active ? "var(--color-crit)" : "var(--color-low)",
        boxShadow: active ? "var(--glow-crit)" : "none",
      }}
    />
  );
}

/** N small check ticks in --color-low. */
function CheckTicks({ count }: { count: number }) {
  const n = Math.max(1, Math.min(count, 8));
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} width="12" height="12" viewBox="0 0 12 12" className="text-(--color-low)">
          <path
            d="M2.5 6.2 L4.8 8.5 L9.5 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

/** Mini coverage bar for technical MCSB/SOX tiles. */
function CoverageBar({ ratio }: { ratio: number }) {
  const pct = Math.min(100, Math.max(0, ratio));
  const color = pct < 60 ? "var(--color-high)" : "var(--color-low)";
  return (
    <div className="h-1.5 w-12 overflow-hidden rounded-full bg-(--line)" aria-hidden>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

const FINDING_TOTAL = Object.values(SEVERITY_COUNTS).reduce((s, n) => s + n, 0);

function kpiSubLine(m: HeadlineMetric): string {
  const label = m.label.toLowerCase();
  if (label.includes("overall risk")) return "target < 40";
  if (label.includes("critical issues") || label.includes("open criticals")) {
    return `${m.value} of ${FINDING_TOTAL} findings`;
  }
  if (label.includes("data exposure")) return "public container live";
  if (label.includes("quick wins")) return "highest-leverage fixes";
  if (label.includes("mcsb")) {
    const gaps = COMPLIANCE.find((c) => c.framework === "MCSB")?.gaps.length ?? 0;
    return `${gaps} control gap${gaps === 1 ? "" : "s"}`;
  }
  if (label.includes("sox")) {
    const gaps = COMPLIANCE.find((c) => c.framework === "SOX")?.gaps.length ?? 0;
    return `${gaps} control gap${gaps === 1 ? "" : "s"}`;
  }
  if (label.includes("mttr")) return "remediation SLA";
  return m.intent === "positive" ? "on track" : m.intent === "negative" ? "needs attention" : "status";
}

function KpiMicroViz({ m }: { m: HeadlineMetric }) {
  const label = m.label.toLowerCase();
  if (label.includes("overall risk") && typeof m.value === "number") {
    return <RiskArc score={m.value} color={riskSeverityColor(m.value)} />;
  }
  if (label.includes("critical issues") || label.includes("open criticals")) {
    const filled = typeof m.value === "number" ? m.value : 0;
    // N = filled count from the metric (2 filled crit squares for the sample).
    return <CritTicks total={filled} filled={filled} />;
  }
  if (label.includes("data exposure")) {
    const active = String(m.value).toLowerCase() === "yes";
    return <StatusDot active={active} />;
  }
  if (label.includes("quick wins")) {
    const n = typeof m.value === "number" ? m.value : 3;
    return <CheckTicks count={n} />;
  }
  if (label.includes("coverage") && typeof m.value === "number") {
    return <CoverageBar ratio={m.value} />;
  }
  if (label.includes("mttr")) {
    return <CheckTicks count={1} />;
  }
  return null;
}

function valueColor(m: HeadlineMetric): string {
  const label = m.label.toLowerCase();
  if (label.includes("overall risk") && typeof m.value === "number") {
    return riskSeverityColor(m.value);
  }
  if (label.includes("data exposure")) {
    return String(m.value).toLowerCase() === "yes" ? "var(--color-crit)" : "var(--color-low)";
  }
  if (label.includes("quick wins")) return "var(--color-low)";
  if (m.intent === "negative") return "var(--color-neg)";
  if (m.intent === "positive") return "var(--color-pos)";
  return "var(--ink)";
}

function KpiTile({ m }: { m: HeadlineMetric }) {
  const color = valueColor(m);
  return (
    <div className="card flex flex-col gap-2 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <TelemetryLabel>{m.label}</TelemetryLabel>
        <KpiMicroViz m={m} />
      </div>
      <div className="telemetry text-[36px] leading-none font-bold tabular-nums" style={{ color }}>
        {m.value}
        {m.unit ? (
          <span className="ml-0.5 text-base font-semibold text-(--muted)">{m.unit}</span>
        ) : null}
      </div>
      <div className="text-xs text-(--muted)">{kpiSubLine(m)}</div>
    </div>
  );
}

/** Orbital constellation empty-state illustration — AmbientBackdrop vocabulary. */
function EmptyConstellation({ size = 148 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 148 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0 text-(--muted)"
    >
      <g stroke="currentColor" strokeWidth="1.25" opacity="0.55">
        <ellipse cx="74" cy="74" rx="58" ry="24" transform="rotate(-28 74 74)" />
        <ellipse cx="74" cy="74" rx="46" ry="18" transform="rotate(-28 74 74)" />
        <ellipse cx="74" cy="74" rx="32" ry="12" transform="rotate(-28 74 74)" />
      </g>
      <g fill="var(--accent)" opacity="0.35">
        <circle cx="126" cy="58" r="3.5" />
        <circle cx="28" cy="86" r="3" />
        <circle cx="96" cy="42" r="2.5" />
        <circle cx="52" cy="108" r="2.5" />
        <circle cx="74" cy="74" r="4" opacity="0.7" />
      </g>
    </svg>
  );
}

export function Dashboard() {
  const [role, setRole] = useState<Role>("business_owner");
  const [view, setView] = useState<View>("executive");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => NOTIFICATIONS.filter((n) => n.visibleToRoles.includes(role)).sort((a, b) => b.priority - a.priority),
    [role],
  );
  const chosen = useMemo(
    () => visible.filter((n) => selected.has(n.id)).sort((a, b) => b.priority - a.priority),
    [visible, selected],
  );
  const metrics = view === "executive" ? EXEC_METRICS : TECH_METRICS;
  const narrative = view === "executive" ? EXEC_NARRATIVE : TECH_NARRATIVE;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const hero = chosen[0];
  const heroIsCrit = hero?.severity === "critical";

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-(--accent-text)">
              <BrandMark withWordmark size={24} />
            </span>
            <span className="text-sm font-medium text-(--muted)">
              Tactical Analysis &amp; Reporting System
            </span>
          </div>
          <div className="telemetry mt-1.5 text-[12px] text-(--muted)">
            Contoso Financial · Production (sub-prod-01) · scanned nightly by the Claude fleet
          </div>
        </div>
        <div
          className="inline-flex rounded-[10px] border border-(--line) bg-(--panel) p-0.5"
          role="group"
          aria-label="View mode"
        >
          {(["executive", "technical"] as View[]).map((v) => {
            const active = view === v;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={active}
                onClick={() => setView(v)}
                className={`min-h-10 rounded-[8px] px-3.5 text-sm capitalize ${transitionFast} ${focusRing} ${
                  active
                    ? "bg-(--accent) text-(--accent-contrast)"
                    : "bg-transparent text-(--ink) hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </header>

      {/* Role switcher (RBAC) */}
      <div className="card mb-4 flex flex-wrap items-center gap-3 rounded-xl p-2">
        <TelemetryLabel className="px-2">Viewing as</TelemetryLabel>
        <div
          className="inline-flex flex-wrap rounded-[10px] border border-(--line) bg-(--panel) p-0.5"
          role="group"
          aria-label="Role"
        >
          {ROLES.map((r) => {
            const active = role === r.id;
            return (
              <button
                key={r.id}
                type="button"
                title={r.blurb}
                aria-pressed={active}
                onClick={() => {
                  setRole(r.id);
                  setSelected(new Set());
                }}
                className={`min-h-10 rounded-[8px] px-3 text-sm ${transitionFast} ${focusRing} ${
                  active
                    ? "bg-(--accent) text-(--accent-contrast)"
                    : "bg-transparent text-(--ink) hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <span className="ml-auto px-2 text-xs text-(--muted)">{ROLES.find((r) => r.id === role)?.blurb}</span>
      </div>

      {/* KPI band — differentiated micro-viz per tile */}
      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map((m) => (
          <KpiTile key={m.label} m={m} />
        ))}
      </section>

      {/* Executive / technical narrative */}
      <div className="card mb-4 max-w-[75ch] rounded-xl p-4 text-[15px] leading-[1.7] text-(--ink)">
        {narrative}
      </div>

      {/* Feed + drill-down */}
      <div className="grid items-start gap-4 md:grid-cols-[360px_1fr]">
        <section className="card rounded-2xl">
          <h2 className="border-b border-(--line) px-4 py-3">
            <TelemetryLabel>
              Notifications · {visible.length} for this role
            </TelemetryLabel>
          </h2>
          <div className="max-h-[520px] overflow-y-auto">
            {visible.map((n) => (
              <label
                key={n.id}
                className={`flex min-h-10 cursor-pointer gap-3 border-b border-(--line) px-4 py-3 hover:bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] ${transitionFast}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(n.id)}
                  onChange={() => toggle(n.id)}
                  className={`mt-1 size-[18px] shrink-0 ${focusRing}`}
                  style={{ accentColor: "var(--accent)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-(--ink)">{n.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-(--muted)">
                    <Pill severity={n.severity} />
                    <span>{n.category}</span>
                    <span className="telemetry ml-auto font-bold tabular-nums">P{n.priority}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="card rounded-2xl">
          <h2 className="border-b border-(--line) px-4 py-3">
            <TelemetryLabel>Drill-down</TelemetryLabel>
          </h2>
          <div className="p-5">
            {chosen.length === 0 ? (
              <>
                <h3 className="mb-4 text-lg font-semibold text-(--ink)">Environment risk overview</h3>
                <div className="flex flex-wrap items-center gap-8">
                  <SeverityDonut counts={SEVERITY_COUNTS} />
                  <RiskGauge score={RISK_SCORE} />
                  <div className="min-w-[180px] flex-1">
                    <div className="mb-2">
                      <TelemetryLabel>Compliance coverage</TelemetryLabel>
                    </div>
                    {COMPLIANCE.map((c) => (
                      <div key={c.framework} className="mb-2">
                        <div className="mb-1 flex justify-between text-[13px]">
                          <span className="text-(--ink)">{c.framework}</span>
                          <span className="telemetry text-(--muted) tabular-nums">
                            {Math.round(c.coverage * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--line)">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${c.coverage * 100}%`,
                              background: c.coverage < 0.6 ? "var(--color-high)" : "var(--color-low)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compact empty-selection hint */}
                <div className="mt-4 flex items-center gap-3 border-t border-(--line) pt-3">
                  <EmptyConstellation size={44} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-(--ink)">No findings selected</p>
                    <p className="mt-0.5 text-[13px] text-(--muted)">
                      Check notifications to build a focused drill-down — the highest priority becomes the hero.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div
                  className="card mb-4 rounded-xl p-4"
                  style={{
                    boxShadow: heroIsCrit
                      ? "var(--shadow), var(--glow-crit)"
                      : "var(--shadow)",
                  }}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <div className="telemetry text-[40px] leading-none font-bold tabular-nums text-(--ink)">
                      {hero!.priority}
                      <span className="text-base font-semibold text-(--muted)">/100</span>
                    </div>
                    <Pill severity={hero!.severity} />
                    <h3 className="text-lg font-semibold text-(--ink)">{hero!.title}</h3>
                  </div>
                  <div className="mb-1 flex items-center gap-2 text-sm text-(--muted)">
                    <span>{hero!.category}</span>
                  </div>
                  <div className="mt-2 h-1 w-full max-w-xs overflow-hidden rounded-full bg-(--line)">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${hero!.priority}%`,
                        background: SEVERITY_COLOR[hero!.severity],
                      }}
                    />
                  </div>
                  <p className="mt-4 leading-relaxed text-(--ink)">{hero!.summary}</p>
                </div>

                {chosen.length > 1 && (
                  <div className="grid gap-2.5">
                    {chosen.slice(1).map((n) => (
                      <div key={n.id} className="rounded-lg border border-(--line) p-3">
                        <div className="flex flex-wrap items-center gap-2 font-semibold text-(--ink)">
                          <Pill severity={n.severity} />
                          <span>{n.title}</span>
                        </div>
                        <div className="mt-1 text-sm text-(--muted)">{n.summary}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <Chat role={role} />
    </div>
  );
}
