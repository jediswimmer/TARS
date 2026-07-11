"use client";

import { useMemo, useState } from "react";
import type { Notification, Role } from "@tars/contracts";
import { COMPLIANCE, EXEC_METRICS, EXEC_NARRATIVE, NOTIFICATIONS, RISK_SCORE, ROLES, SEVERITY_COLOR, SEVERITY_COUNTS, TECH_METRICS, TECH_NARRATIVE } from "../lib/sample";
import { RiskGauge, SeverityDonut } from "./Charts";
import { Chat } from "./Chat";

type View = "executive" | "technical";

function Pill({ severity }: { severity: Notification["severity"] }) {
  return (
    <span className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: SEVERITY_COLOR[severity] }}>
      {severity}
    </span>
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
  const chosen = useMemo(() => visible.filter((n) => selected.has(n.id)).sort((a, b) => b.priority - a.priority), [visible, selected]);
  const metrics = view === "executive" ? EXEC_METRICS : TECH_METRICS;
  const narrative = view === "executive" ? EXEC_NARRATIVE : TECH_NARRATIVE;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-xl font-bold tracking-tight">
            TARS <span className="muted text-sm font-medium">Tactical Analysis &amp; Reporting System</span>
          </div>
          <div className="muted text-sm">Contoso Financial · Production (sub-prod-01) · scanned nightly by the Claude fleet</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="muted">View</span>
          {(["executive", "technical"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className="rounded-md border px-2.5 py-1 capitalize divide-line" style={{ background: view === v ? "var(--accent)" : "transparent", color: view === v ? "#fff" : "var(--ink)" }}>
              {v}
            </button>
          ))}
        </div>
      </header>

      {/* Role switcher (RBAC) */}
      <div className="card mb-4 flex flex-wrap items-center gap-2 rounded-xl p-2">
        <span className="muted px-2 text-xs uppercase tracking-wide">Viewing as</span>
        {ROLES.map((r) => (
          <button key={r.id} onClick={() => { setRole(r.id); setSelected(new Set()); }} title={r.blurb} className="rounded-lg px-3 py-1.5 text-sm" style={{ background: role === r.id ? "var(--accent)" : "transparent", color: role === r.id ? "#fff" : "var(--ink)", border: "1px solid var(--line)" }}>
            {r.label}
          </button>
        ))}
        <span className="muted ml-auto px-2 text-xs">{ROLES.find((r) => r.id === role)?.blurb}</span>
      </div>

      {/* KPI infographics */}
      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="card rounded-xl p-4">
            <div className="muted text-xs uppercase tracking-wide">{m.label}</div>
            <div className="mt-1 text-2xl font-bold" style={{ color: m.intent === "negative" ? "var(--color-neg)" : m.intent === "positive" ? "var(--color-pos)" : "var(--ink)" }}>
              {m.value}
              {m.unit ? <span className="muted ml-0.5 text-base font-semibold">{m.unit}</span> : null}
            </div>
          </div>
        ))}
      </section>

      {/* Narrative */}
      <div className="card mb-4 rounded-xl p-4 text-[15px] leading-relaxed">{narrative}</div>

      {/* Feed + drill-down */}
      <div className="grid items-start gap-4 md:grid-cols-[360px_1fr]">
        <section className="card rounded-2xl">
          <h2 className="muted border-b px-4 py-3 text-xs uppercase tracking-wide divide-line">Notifications · {visible.length} for this role</h2>
          <div className="max-h-[520px] overflow-y-auto">
            {visible.map((n) => (
              <label key={n.id} className="flex cursor-pointer gap-3 border-b px-4 py-3 divide-line hover:bg-black/[.03] dark:hover:bg-white/[.04]">
                <input type="checkbox" checked={selected.has(n.id)} onChange={() => toggle(n.id)} className="mt-1 h-4 w-4" style={{ accentColor: "var(--accent)" }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{n.title}</div>
                  <div className="muted mt-0.5 flex items-center gap-2 text-xs">
                    <Pill severity={n.severity} />
                    <span>{n.category}</span>
                    <span className="ml-auto font-bold tabular-nums">P{n.priority}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="card rounded-2xl">
          <h2 className="muted border-b px-4 py-3 text-xs uppercase tracking-wide divide-line">Drill-down</h2>
          <div className="p-5">
            {chosen.length === 0 ? (
              <>
                <h3 className="mb-4 text-lg font-semibold">Environment risk overview</h3>
                <div className="flex flex-wrap items-center gap-8">
                  <SeverityDonut counts={SEVERITY_COUNTS} />
                  <RiskGauge score={RISK_SCORE} />
                  <div className="min-w-[180px] flex-1">
                    <div className="muted mb-2 text-xs uppercase tracking-wide">Compliance coverage</div>
                    {COMPLIANCE.map((c) => (
                      <div key={c.framework} className="mb-1.5">
                        <div className="flex justify-between text-sm">
                          <span>{c.framework}</span>
                          <span className="muted tabular-nums">{Math.round(c.coverage * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                          <div className="h-full rounded-full" style={{ width: `${c.coverage * 100}%`, background: c.coverage < 0.6 ? "var(--color-high)" : "var(--color-low)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="muted mt-5 border-t pt-4 text-sm divide-line">Check one or more notifications to build a focused, live drill-down. The highest-priority selection becomes the hero.</p>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <Pill severity={chosen[0]!.severity} />
                  <h3 className="text-lg font-semibold">{chosen[0]!.title}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-8">
                  <div>
                    <div className="muted text-xs uppercase tracking-wide">Priority</div>
                    <div className="text-4xl font-bold">
                      {chosen[0]!.priority}
                      <span className="muted text-base font-semibold">/100</span>
                    </div>
                    <div className="mt-1 h-2 w-52 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                      <div className="h-full rounded-full" style={{ width: `${chosen[0]!.priority}%`, background: SEVERITY_COLOR[chosen[0]!.severity] }} />
                    </div>
                  </div>
                  <div className="muted text-sm">{chosen[0]!.category}</div>
                </div>
                <p className="mt-4 border-t pt-4 leading-relaxed divide-line">{chosen[0]!.summary}</p>
                {chosen.length > 1 && (
                  <div className="mt-3 grid gap-2.5">
                    {chosen.slice(1).map((n) => (
                      <div key={n.id} className="rounded-lg border p-3 divide-line">
                        <div className="font-semibold">
                          <Pill severity={n.severity} /> <span className="ml-1.5">{n.title}</span>
                        </div>
                        <div className="muted mt-1 text-sm">{n.summary}</div>
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
