import type { ReactNode } from "react";

export interface Column {
  key: string;
  label: string;
}

/**
 * Accessible tabular fallback for a chart. Every visualization ships one so the
 * data is reachable without color or pointer interaction (screen readers, print,
 * "show data" toggle). Kept deliberately plain — this is the a11y source of truth.
 */
export function DataTable({
  columns,
  rows,
  caption,
}: {
  columns: Column[];
  rows: Record<string, ReactNode>[];
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption ? <caption className="muted mb-2 text-left text-xs">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className="border-b px-2 py-1.5 text-left font-semibold divide-line">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className="border-b px-2 py-1.5 align-top divide-line">
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
