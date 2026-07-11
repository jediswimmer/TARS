"use client";

import { useEffect, useState } from "react";
import {
  THEME_OPTIONS,
  applyTheme,
  readStoredTheme,
  writeStoredTheme,
  type ThemePreference,
} from "../lib/theme";

const transitionFast = "transition-[background-color,color,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)]";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg)";

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredTheme();
    setPreference(stored);
    applyTheme(stored);
    setReady(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      const current = readStoredTheme();
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onSystemChange);
    return () => mq.removeEventListener("change", onSystemChange);
  }, []);

  function select(next: ThemePreference) {
    setPreference(next);
    writeStoredTheme(next);
    applyTheme(next);
  }

  return (
    <div
      className="inline-flex rounded-[10px] border border-(--line) bg-(--panel) p-0.5"
      role="group"
      aria-label="Color theme"
      data-ready={ready ? "true" : "false"}
    >
      {THEME_OPTIONS.map((opt) => {
        const active = preference === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => select(opt.id)}
            className={`min-h-10 rounded-[8px] px-3 text-sm ${transitionFast} ${focusRing} ${
              active
                ? "bg-(--accent) text-(--accent-contrast)"
                : "bg-transparent text-(--ink) hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
