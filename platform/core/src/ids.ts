import { randomUUID } from "node:crypto";

/** Short, sortable-ish id with a human-readable prefix, e.g. "scan_findings_9f3a1c". */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

/** A run id groups every artifact produced by one pipeline execution. */
export function newRunId(): string {
  return `run_${new Date().toISOString().slice(0, 10)}_${randomUUID().slice(0, 6)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
