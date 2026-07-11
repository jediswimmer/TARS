"use client";

import { useState } from "react";
import type { Role } from "@tars/contracts";

type Msg = { who: "you" | "agent"; text: string };

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)";

/** RBAC-scoped customer-service chat. Posts the current role to /api/chat, which
 *  runs the shared CustomerServiceAgent with retrieval scoped to that role. */
export function Chat({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  async function ask(questionOverride?: string) {
    const question = (questionOverride ?? q).trim();
    if (!question || busy) return;
    if (!questionOverride) {
      setMsgs((m) => [...m, { who: "you", text: question }]);
      setQ("");
    }
    setLastQuestion(question);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, question }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ? "The fleet could not answer that request." : "The fleet returned an unexpected response.");
        return;
      }
      setMsgs((m) => [...m, { who: "agent", text: data.answer ?? "No response." }]);
    } catch {
      setError("Could not reach the fleet. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const canAsk = q.trim().length > 0 && !busy;

  return (
    <section className="card mt-4 rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-10 w-full items-center justify-between px-4 py-3 text-left ${focusRing}`}
      >
        <span className="telemetry text-[11px] font-medium tracking-[0.05em] text-(--muted) uppercase">
          Customer service · answers scoped to your role ({role})
        </span>
        <span
          className="text-(--muted) transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)]"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="border-t border-(--line) p-4">
          <div className="mb-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
            {msgs.length === 0 && !busy && !error && (
              <div className="text-sm text-(--muted)">
                Ask about your findings, remediation, or compliance.
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.who === "you" ? "self-end" : "self-start"}>
                <div
                  className={`max-w-prose rounded-2xl px-3 py-2 text-sm ${
                    m.who === "you"
                      ? "bg-(--accent) text-(--accent-contrast)"
                      : "bg-(--line) text-(--ink)"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="self-start" aria-live="polite" aria-busy="true">
                <div className="telemetry flex items-center gap-2 rounded-2xl bg-(--line) px-3 py-2 text-sm text-(--muted)">
                  <span className="inline-flex gap-1" aria-hidden>
                    <span className="tars-chat-dot">·</span>
                    <span className="tars-chat-dot tars-chat-dot-2">·</span>
                    <span className="tars-chat-dot tars-chat-dot-3">·</span>
                  </span>
                  <span>querying fleet…</span>
                </div>
              </div>
            )}
            {error && !busy && (
              <div className="flex flex-wrap items-center gap-2 text-sm" role="alert">
                <span className="text-(--color-crit)">{error}</span>
                {lastQuestion && (
                  <button
                    type="button"
                    onClick={() => ask(lastQuestion)}
                    className={`min-h-10 font-medium text-(--accent-text) underline-offset-2 hover:underline ${focusRing}`}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="telemetry mb-2 text-[11px] tracking-[0.05em] text-(--muted) uppercase">
            Scope · {role} only
          </p>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canAsk && ask()}
              placeholder="e.g. What's our single biggest risk right now?"
              className={`min-h-10 flex-1 rounded-[10px] border border-(--line) bg-(--panel) px-3 py-2 text-sm text-(--ink) placeholder:text-(--muted) transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] focus:border-(--accent) focus:shadow-[var(--glow-accent)] focus:outline-none dark:bg-(--panel-elevated) ${focusRing}`}
            />
            <button
              type="button"
              onClick={() => ask()}
              disabled={!canAsk}
              className={`min-h-10 rounded-[10px] bg-(--accent) px-4 py-2 text-sm font-semibold text-(--accent-contrast) transition-[background-color,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`}
            >
              Ask
            </button>
          </div>
        </div>
      )}
      {/* Local keyframes — globals.css may only receive the --accent-contrast token. */}
      <style>{`
        @keyframes tars-chat-dot {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
        .tars-chat-dot {
          animation: tars-chat-dot var(--dur-med) var(--ease-out) infinite;
        }
        .tars-chat-dot-2 { animation-delay: 70ms; }
        .tars-chat-dot-3 { animation-delay: 140ms; }
      `}</style>
    </section>
  );
}
