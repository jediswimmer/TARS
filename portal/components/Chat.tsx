"use client";

import { useState } from "react";
import type { Role } from "@tars/contracts";

type Msg = { who: "you" | "agent"; text: string };

/** RBAC-scoped customer-service chat. Posts the current role to /api/chat, which
 *  runs the shared CustomerServiceAgent with retrieval scoped to that role. */
export function Chat({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask() {
    const question = q.trim();
    if (!question || busy) return;
    setMsgs((m) => [...m, { who: "you", text: question }]);
    setQ("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role, question }) });
      const data = (await res.json()) as { answer?: string; error?: string };
      setMsgs((m) => [...m, { who: "agent", text: data.answer ?? data.error ?? "No response." }]);
    } catch {
      setMsgs((m) => [...m, { who: "agent", text: "Request failed." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-4 rounded-2xl">
      <button onClick={() => setOpen((o) => !o)} className="muted flex w-full items-center justify-between px-4 py-3 text-xs uppercase tracking-wide">
        <span>Customer service · answers scoped to your role ({role})</span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t p-4 divide-line">
          <div className="mb-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
            {msgs.length === 0 && <div className="muted text-sm">Ask about your findings, remediation, or compliance. The agent only sees what your role is permitted to see.</div>}
            {msgs.map((m, i) => (
              <div key={i} className={m.who === "you" ? "self-end" : "self-start"}>
                <div className="rounded-2xl px-3 py-2 text-sm" style={{ background: m.who === "you" ? "var(--accent)" : "var(--line)", color: m.who === "you" ? "#fff" : "var(--ink)" }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="e.g. What's our single biggest risk right now?" className="flex-1 rounded-lg border px-3 py-2 text-sm divide-line" style={{ background: "var(--bg)", color: "var(--ink)" }} />
            <button onClick={ask} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--accent)" }}>
              {busy ? "…" : "Ask"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
