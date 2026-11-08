'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type SortDirection = 'asc' | 'desc';
export type SortValue = string | number | null | undefined;
export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

/**
 * Stable sort by an accessor. Missing values always sort last whatever the direction; numbers
 * compare numerically; everything else uses a natural, case-insensitive compare ("item 2" < "item 10").
 */
export function sortRows<T>(
  rows: readonly T[],
  value: (row: T) => SortValue,
  direction: SortDirection,
): T[] {
  const sign = direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, v: value(row) }))
    .sort((a, b) => {
      const aMissing = a.v === null || a.v === undefined || a.v === '';
      const bMissing = b.v === null || b.v === undefined || b.v === '';
      if (aMissing || bMissing) {
        if (aMissing && bMissing) return a.index - b.index;
        return aMissing ? 1 : -1;
      }
      const cmp =
        typeof a.v === 'number' && typeof b.v === 'number'
          ? a.v - b.v
          : String(a.v).localeCompare(String(b.v), undefined, {
              numeric: true,
              sensitivity: 'base',
            });
      return cmp === 0 ? a.index - b.index : cmp * sign;
    })
    .map((entry) => entry.row);
}

/** Clicking the active column flips direction; a new column starts at its default direction. */
export function nextSort<K extends string>(
  current: SortState<K>,
  key: K,
  defaultDirection: SortDirection = 'desc',
): SortState<K> {
  if (current.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  return { key, direction: defaultDirection };
}

export interface UseTableViewOptions<K extends string> {
  initialKey: K;
  initialDirection?: SortDirection;
  /** Direction a newly clicked column starts in. */
  defaultDirection?: SortDirection;
  /** Rows shown while collapsed. `Infinity` disables collapsing. */
  pageSize?: number;
  /** When false, rows keep their given order until a header is clicked. */
  sortFromStart?: boolean;
}

/** Sort + "show all" state for a small table. */
export function useTableView<T, K extends string>(
  rows: readonly T[],
  value: (row: T, key: K) => SortValue,
  {
    initialKey,
    initialDirection = 'desc',
    defaultDirection = 'desc',
    pageSize = 5,
    sortFromStart = true,
  }: UseTableViewOptions<K>,
) {
  const [sort, setSort] = useState<SortState<K>>({ key: initialKey, direction: initialDirection });
  const [sorted, setSorted] = useState(sortFromStart);
  const [expanded, setExpanded] = useState(false);

  const ordered = useMemo(
    () => (sorted ? sortRows(rows, (row) => value(row, sort.key), sort.direction) : [...rows]),
    [rows, value, sort, sorted],
  );
  const visibleRows = expanded ? ordered : ordered.slice(0, pageSize);

  const toggleSort = (key: K) => {
    setSort((current) =>
      sorted ? nextSort(current, key, defaultDirection) : { key, direction: defaultDirection },
    );
    setSorted(true);
  };
  const ariaSort = (key: K): 'ascending' | 'descending' | 'none' =>
    sorted && sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
  const arrow = (key: K): string =>
    sorted && sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '';

  return {
    visibleRows,
    expanded,
    toggleExpanded: () => setExpanded((e) => !e),
    toggleSort,
    sortBy: sort,
    ariaSort,
    arrow,
    total: rows.length,
    pageSize,
  };
}

export interface SortHeaderProps {
  label: ReactNode;
  ariaSort: 'ascending' | 'descending' | 'none';
  arrow: string;
  onSort: () => void;
  /** Optional explanation rendered after the label (e.g. an Arsenal `Tooltip`). */
  hint?: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

/** `<th>` with a sort button; `aria-sort` lives on the header cell as the ARIA table pattern expects. */
export function SortHeader({
  label,
  ariaSort,
  arrow,
  onSort,
  hint,
  align = 'left',
  className,
}: SortHeaderProps) {
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={cn(align === 'right' && 'text-right', className)}
    >
      <span
        className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}
      >
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'inline-flex items-center gap-1 rounded-arsenal-sm font-semibold transition-colors',
            'text-arsenal-secondary hover:text-arsenal-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent',
            ariaSort !== 'none' && 'text-arsenal-primary',
          )}
        >
          {label}
          <span aria-hidden="true" className="inline-block w-3 text-arsenal-accent">
            {arrow}
          </span>
        </button>
        {hint}
      </span>
    </th>
  );
}

export interface TableViewToggleProps {
  total: number;
  expanded: boolean;
  onToggle: () => void;
  pageSize?: number;
  showAllLabel?: (total: number) => ReactNode;
  showLessLabel?: ReactNode;
  className?: string;
}

/** "Show all N" / "Show less"; renders nothing when everything already fits. */
export function TableViewToggle({
  total,
  expanded,
  onToggle,
  pageSize = 5,
  showAllLabel = (n) => `Show all ${n}`,
  showLessLabel = 'Show less',
  className,
}: TableViewToggleProps) {
  if (total <= pageSize) return null;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        'mt-2 rounded-arsenal-sm text-sm font-medium text-arsenal-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent',
        className,
      )}
    >
      {expanded ? showLessLabel : showAllLabel(total)}
    </button>
  );
}
