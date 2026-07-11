"use client";

import { useId, useState, type ReactNode } from "react";
import { DataTable, type DataTableColumn } from "./DataTable";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg)";

interface ChartFrameProps<T> {
  title: string;
  description?: string;
  /** data-viz attribute for RBAC / verification probes */
  dataViz: string;
  children: ReactNode;
  /** Optional a11y table fallback */
  tableColumns?: DataTableColumn<T>[];
  tableRows?: T[];
  className?: string;
  /** Drop body padding so a chart can paint edge-to-edge under the header. */
  bleed?: boolean;
}

export function ChartFrame<T>({
  title,
  description,
  dataViz,
  children,
  tableColumns,
  tableRows,
  className = "",
  bleed = false,
}: ChartFrameProps<T>) {
  const titleId = useId();
  const [showTable, setShowTable] = useState(false);
  const hasTable = Boolean(tableColumns && tableRows && tableRows.length > 0);

  return (
    <figure
      data-viz={dataViz}
      className={`card overflow-hidden rounded-2xl ${className}`}
      aria-labelledby={titleId}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--line) px-4 py-3">
        <div className="min-w-0">
          <h3 id={titleId} className="telemetry text-[11px] font-medium tracking-[0.05em] text-(--muted) uppercase">
            {title}
          </h3>
          {description ? <p className="mt-0.5 text-[13px] text-(--muted)">{description}</p> : null}
        </div>
        {hasTable ? (
          <button
            type="button"
            className={`min-h-10 rounded-[8px] px-3 text-sm text-(--ink) hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] ${focusRing}`}
            aria-pressed={showTable}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? "Show chart" : "Show table"}
          </button>
        ) : null}
      </div>
      <div className={showTable || !bleed ? "p-4" : undefined}>
        {showTable && hasTable ? (
          <DataTable columns={tableColumns!} rows={tableRows!} caption={title} />
        ) : (
          children
        )}
      </div>
    </figure>
  );
}
