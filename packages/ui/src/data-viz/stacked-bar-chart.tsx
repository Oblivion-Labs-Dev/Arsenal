import { useState } from 'react';
import { cn } from '../lib/cn';
import { ChartDataTable } from './chart-data-table';
import { stackMax, stackTotal } from './chart-geometry';

export interface StackedBarSeries<K extends string> {
  key: K;
  label: string;
  color: string;
}

export interface StackedBarRow<K extends string> {
  /** X-axis label, e.g. a date. */
  label: string;
  values: Readonly<Record<K, number | null>>;
}

export interface StackedBarChartProps<K extends string> {
  series: StackedBarSeries<K>[];
  rows: StackedBarRow<K>[];
  /** Accessible name and table caption. */
  label: string;
  /** Plot height in px. */
  height?: number;
  emptyText?: string;
  className?: string;
}

/**
 * Stacked columns with a toggleable legend, a hover/focus readout announced politely, and a
 * "Show data" table. Hidden series drop out of the scale too.
 */
export function StackedBarChart<K extends string>({
  series,
  rows,
  label,
  height = 160,
  emptyText = 'No data yet.',
  className,
}: StackedBarChartProps<K>) {
  const [hidden, setHidden] = useState<ReadonlySet<K>>(() => new Set());
  const [focused, setFocused] = useState<number | null>(null);
  if (rows.length === 0) {
    return (
      <p className={cn('m-0 text-sm text-[var(--arsenal-text-secondary)]', className)}>
        {emptyText}
      </p>
    );
  }
  const visible = series.filter((s) => !hidden.has(s.key));
  const keys = visible.map((s) => s.key);
  const max = stackMax(
    rows.map((r) => r.values),
    keys,
  );
  const describe = (row: StackedBarRow<K>) =>
    `${row.label}: ${visible
      .map((s) => {
        const v = row.values[s.key];
        return `${s.label} ${v === null || !Number.isFinite(v) ? 'unknown' : v}`;
      })
      .join(', ')}; total ${stackTotal(row.values, keys)}`;
  const toggle = (key: K) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <figure className={cn('m-0 flex flex-col gap-3', className)}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${label} series`}>
        {series.map((s) => {
          const on = !hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-[var(--arsenal-border)] px-2.5 py-0.5 text-xs transition-opacity',
                'hover:border-[var(--arsenal-border-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--arsenal-accent)]',
                on
                  ? 'text-[var(--arsenal-text-primary)]'
                  : 'text-[var(--arsenal-text-secondary)] opacity-60',
              )}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: on ? s.color : 'transparent', border: `1px solid ${s.color}` }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <div
          aria-hidden="true"
          className="flex flex-col justify-between text-right text-[11px] tabular-nums text-[var(--arsenal-text-secondary)]"
          style={{ height }}
        >
          <span>{max}</span>
          <span>{Number((max / 2).toFixed(1))}</span>
          <span>0</span>
        </div>
        <div
          className="relative flex flex-1 items-end gap-1 border-b border-[var(--arsenal-border)]"
          style={{
            height,
            backgroundImage:
              'linear-gradient(to bottom, var(--arsenal-border) 1px, transparent 1px)',
            backgroundSize: `100% ${height / 2}px`,
          }}
        >
          {rows.map((row, i) => {
            const total = stackTotal(row.values, keys);
            return (
              <button
                key={`${row.label}-${i}`}
                type="button"
                aria-label={describe(row)}
                onMouseEnter={() => setFocused(i)}
                onMouseLeave={() => setFocused(null)}
                onFocus={() => setFocused(i)}
                onBlur={() => setFocused(null)}
                className="flex h-full min-w-0 flex-1 flex-col-reverse focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--arsenal-accent)]"
              >
                <span
                  className="flex w-full flex-col-reverse overflow-hidden rounded-t-[var(--arsenal-radius-sm)] transition-[height] duration-300 motion-reduce:transition-none"
                  style={{ height: `${(total / max) * 100}%` }}
                >
                  {visible.map((s) => {
                    const v = row.values[s.key];
                    const safe = v !== null && Number.isFinite(v) && v > 0 ? v : 0;
                    return (
                      <span
                        key={s.key}
                        className="block w-full transition-[height] duration-300 motion-reduce:transition-none"
                        style={{
                          height: total > 0 ? `${(safe / total) * 100}%` : 0,
                          background: s.color,
                        }}
                      />
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p aria-live="polite" className="m-0 min-h-5 text-xs text-[var(--arsenal-text-secondary)]">
        {focused !== null && rows[focused] ? describe(rows[focused]) : ''}
      </p>
      <ChartDataTable
        mode="details"
        caption={label}
        columns={['Row', ...series.map((s) => s.label)]}
        rows={rows.map((row) => [row.label, ...series.map((s) => row.values[s.key])])}
      />
    </figure>
  );
}
