import type { Logger } from "@tars/contracts";

/** Minimal structured console logger. Swap for pino/winston in production. */
export function createLogger(scope: string): Logger {
  const fmt = (level: string, msg: string, meta?: Record<string, unknown>) => {
    const base = `[${new Date().toISOString()}] ${level} (${scope}) ${msg}`;
    return meta && Object.keys(meta).length ? `${base} ${JSON.stringify(meta)}` : base;
  };
  return {
    info: (msg, meta) => console.log(fmt("INFO", msg, meta)),
    warn: (msg, meta) => console.warn(fmt("WARN", msg, meta)),
    error: (msg, meta) => console.error(fmt("ERROR", msg, meta)),
  };
}
