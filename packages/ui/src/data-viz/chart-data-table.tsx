import { cn } from '../lib/cn';

export type ChartDataCell = string | number | null;

export interface ChartDataTableProps {
  caption: string;
  columns: string[];
  rows: ChartDataCell[][];
  /** `sr-only` hides it visually; `details` puts it behind a "Show data" disclosure. */
  mode?: 'sr-only' | 'details';
  /** Summary text for `details` mode. */
  summary?: string;
  className?: string;
}

const cellText = (cell: ChartDataCell) =>
  cell === null || (typeof cell === 'number' && !Number.isFinite(cell)) ? 'unknown' : String(cell);

/** Table fallback for a chart, so every plotted number is reachable without seeing the chart. */
export function ChartDataTable({
  caption,
  columns,
  rows,
  mode = 'sr-only',
  summary = 'Show data',
  className,
}: ChartDataTableProps) {
  const table = (
    <table
      className={cn(
        mode === 'sr-only'
          ? 'sr-only'
          : 'mt-2 w-full border-collapse text-left text-xs tabular-nums text-[var(--arsenal-text-primary)]',
      )}
    >
      <caption className={mode === 'sr-only' ? undefined : 'sr-only'}>{caption}</caption>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col}
              scope="col"
              className="border-b border-[var(--arsenal-border)] px-2 py-1 font-semibold text-[var(--arsenal-text-secondary)]"
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          // Rows are positional (one per data point), so the index is their identity.
          <tr key={r}>
            {row.map((cell, c) =>
              c === 0 ? (
                <th key={c} scope="row" className="px-2 py-1 font-normal">
                  {cellText(cell)}
                </th>
              ) : (
                <td key={c} className="px-2 py-1">
                  {cellText(cell)}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
  if (mode === 'sr-only') return <div className={className}>{table}</div>;
  return (
    <details className={cn('text-sm text-[var(--arsenal-text-secondary)]', className)}>
      <summary className="cursor-pointer select-none">{summary}</summary>
      {table}
    </details>
  );
}
