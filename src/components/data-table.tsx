import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui";

export type Column<T> = {
  key: string;
  header: string;
  /** Right-align and use tabular figures. Set for money and quantities. */
  numeric?: boolean;
  /** Hide on mobile card layout — used for low-signal columns. */
  secondary?: boolean;
  render: (row: T) => React.ReactNode;
};

/**
 * One dataset, two layouts.
 *
 * Above `md` this is a real table. Below it, each row becomes a stacked card
 * with its own labels — the legacy AdminLTE screens scrolled sideways on a
 * phone, which made every column past the third unreachable.
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  emptyTitle = "Nothing here yet",
  emptyDescription,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "text-muted px-5 py-3 text-xs font-semibold tracking-wide uppercase",
                    column.numeric && "text-right",
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getKey(row)}
                className="border-b transition-colors duration-150 last:border-0 hover:bg-[color:var(--surface-sunken)]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-5 py-3.5 align-middle",
                      column.numeric && "tabular text-right",
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y md:hidden">
        {rows.map((row) => (
          <li key={getKey(row)} className="space-y-2 px-4 py-4">
            {columns.map((column) => (
              <div
                key={column.key}
                className="flex items-baseline justify-between gap-4"
              >
                <span className="text-muted shrink-0 text-xs font-medium tracking-wide uppercase">
                  {column.header}
                </span>
                <span
                  className={cn(
                    "min-w-0 text-right text-sm",
                    column.numeric && "tabular",
                  )}
                >
                  {column.render(row)}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </>
  );
}
