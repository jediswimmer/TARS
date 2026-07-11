"use client";

import { useState, type ReactNode } from "react";

/**
 * Shared figure wrapper for every visualization: titled `<figure>`, an
 * accessible label, and a "Show data" toggle that swaps the graphic for its
 * tabular fallback. The `dataViz` id is stamped as `data-viz` so tests (and the
 * RBAC null-check) can assert a chart is present/absent by role.
 */
export function ChartFrame({
  title,
  description,
  dataViz,
  table,
  children,
  className,
}: {
  title: string;
  description?: string;
  /** Slug stamped as `data-viz` (e.g. "attack-chain", "topology"). */
  dataViz?: string;
  /** Accessible tabular fallback, revealed by the toggle. */
  table?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <figure
      data-viz={dataViz}
      aria-label={description ? `${title}. ${description}` : title}
      className={`card rounded-2xl p-4 ${className ?? ""}`}
    >
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {description ? <div className="muted mt-0.5 text-xs">{description}</div> : null}
        </div>
        {table ? (
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-pressed={showTable}
            className="muted rounded-md border px-2 py-1 text-xs divide-line"
          >
            {showTable ? "Show chart" : "Show data"}
          </button>
        ) : null}
      </figcaption>
      {showTable && table ? table : children}
    </figure>
  );
}
