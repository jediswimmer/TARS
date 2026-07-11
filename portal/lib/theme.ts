/*
 * Theme preference for the Flight Director's Console.
 * Preference: light | dark | system (default).
 * Applied class: `dark` on <html> when the resolved theme is dark —
 * so CSS tokens and Tailwind `dark:` stay in sync.
 */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "tars-theme";

export const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveDark(preference: ThemePreference): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return getSystemPrefersDark();
}

/** Apply preference to <html> (class + data-theme + color-scheme). */
export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement;
  const dark = resolveDark(preference);
  root.classList.toggle("dark", dark);
  root.dataset.theme = preference;
  root.style.colorScheme = dark ? "dark" : "light";
}

export function readStoredTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* private mode / blocked storage */
  }
  return "system";
}

export function writeStoredTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
}

/**
 * Inline bootstrap — runs before paint to avoid a light flash.
 * Keep in sync with THEME_STORAGE_KEY / applyTheme logic above.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.dataset.theme=p;r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
