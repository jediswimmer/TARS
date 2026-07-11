export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  caption: string;
}

/** Accessible tabular fallback for custom SVG charts. */
export function DataTable<T>({ columns, rows, caption }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-(--line)">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className="telemetry px-2 py-2 text-[11px] font-medium tracking-[0.05em] text-(--muted) uppercase"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-(--line)">
              {columns.map((c) => (
                <td key={c.key} className="px-2 py-2 text-(--ink)">
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
