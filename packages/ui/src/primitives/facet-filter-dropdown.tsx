'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

/** A facet value and how many records carry it. */
export type FacetItem = readonly [value: string, count: number];

/** Facets whose value contains the query (case-insensitive). An empty query returns all of them. */
export function filterFacets(items: readonly FacetItem[], query: string): FacetItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter(([value]) => value.toLowerCase().includes(needle));
}

/** Total records whose facet value contains the text (case-insensitive). */
export function facetSubstringCount(items: readonly FacetItem[], text: string): number {
  const needle = text.trim().toLowerCase();
  if (!needle) return 0;
  return items.reduce(
    (sum, [value, count]) => (value.toLowerCase().includes(needle) ? sum + count : sum),
    0,
  );
}

/**
 * Records matched by the current selection: the exact facet's count when the selection names one,
 * otherwise the sum of every facet containing it. No selection means the total.
 */
export function facetSelectionCount(
  items: readonly FacetItem[],
  selected: string,
  totalCount: number,
): number {
  if (!selected) return totalCount;
  const exact = items.find(([value]) => value === selected);
  return exact ? exact[1] : facetSubstringCount(items, selected);
}

export interface FacetFilterDropdownProps {
  items: readonly FacetItem[];
  /** Selected facet value or free-text substring; empty string means "all". */
  value: string;
  onChange: (value: string) => void;
  totalCount: number;
  ariaLabel: string;
  allLabel?: string;
  searchPlaceholder?: string;
  emptySearchLabel?: string;
  clearLabel?: string;
  /** Copy for the free-text option, e.g. (text) => `Titles containing "${text}"`. */
  substringLabel?: (text: string) => ReactNode;
  icon?: ReactNode;
  /** Typed text is applied as a substring filter after this many ms of no typing. */
  debounceMs?: number;
  /** The search box only appears once there are more facets than this. */
  searchThreshold?: number;
  className?: string;
}

function CheckIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={cn('h-3.5 w-3.5 shrink-0 text-arsenal-accent', !visible && 'invisible')}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/**
 * Single-select facet filter with counts, optional search and a free-text "contains" option.
 * Closes on outside click and Escape; typed text auto-applies after a short pause.
 */
export function FacetFilterDropdown({
  items,
  value,
  onChange,
  totalCount,
  ariaLabel,
  allLabel = 'All',
  searchPlaceholder = 'Search…',
  emptySearchLabel = 'No matches',
  clearLabel = 'Clear filter',
  substringLabel = (text) => `Contains “${text}”`,
  icon,
  debounceMs = 450,
  searchThreshold = 7,
  className,
}: FacetFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();
  const showSearch = items.length > searchThreshold;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (root.current && event.target instanceof Node && !root.current.contains(event.target))
        setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    search.current?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Debounced auto-apply of typed text as a substring filter.
  useEffect(() => {
    const text = query.trim();
    if (!open || !text || text === value) return;
    const timer = setTimeout(() => onChange(text), debounceMs);
    return () => clearTimeout(timer);
  }, [query, open, value, onChange, debounceMs]);

  const visible = useMemo(() => filterFacets(items, query), [items, query]);
  const selectedCount = facetSelectionCount(items, value, totalCount);
  const typed = query.trim();
  const isExact = items.some(([v]) => v.toLowerCase() === typed.toLowerCase());

  const choose = (next: string) => {
    onChange(next);
    setQuery('');
    setOpen(false);
  };

  const optionClass = (active: boolean) =>
    cn(
      'flex w-full items-center gap-2 rounded-arsenal-sm px-2.5 py-1.5 text-left text-sm transition-colors',
      'hover:bg-arsenal-elevated focus-visible:bg-arsenal-elevated focus-visible:outline-none',
      active ? 'text-arsenal-primary' : 'text-arsenal-secondary',
    );

  return (
    <div ref={root} className={cn('relative inline-flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 max-w-[16rem] items-center gap-2 rounded-arsenal border px-3 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent',
          value
            ? 'border-arsenal-accent bg-[color-mix(in_srgb,var(--arsenal-accent)_10%,var(--arsenal-surface))] text-arsenal-primary'
            : 'border-arsenal-border bg-arsenal-surface text-arsenal-secondary hover:border-[var(--arsenal-border-hover)]',
        )}
      >
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <span className="truncate">{value || allLabel}</span>
        <span className="tabular-nums text-arsenal-muted">{selectedCount}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {value ? (
        <button
          type="button"
          aria-label={clearLabel}
          title={clearLabel}
          onClick={() => choose('')}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-arsenal-muted hover:bg-arsenal-elevated hover:text-arsenal-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      ) : null}

      {open ? (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1.5 w-72 rounded-arsenal-lg border border-arsenal-border bg-arsenal-surface p-1.5',
            'shadow-[0_18px_40px_-16px_color-mix(in_srgb,var(--arsenal-background)_70%,black)]',
          )}
        >
          {showSearch ? (
            <input
              ref={search}
              type="search"
              value={query}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && typed) choose(typed);
              }}
              className="mb-1.5 h-8 w-full rounded-arsenal-sm border border-arsenal-border bg-arsenal-background px-2.5 text-sm text-arsenal-primary placeholder:text-arsenal-muted focus:border-arsenal-accent focus:outline-none"
            />
          ) : null}
          <ul
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-72 overflow-y-auto"
          >
            <li role="option" aria-selected={!value}>
              <button type="button" className={optionClass(!value)} onClick={() => choose('')}>
                <CheckIcon visible={!value} />
                <span className="flex-1 truncate">{allLabel}</span>
                <span className="tabular-nums text-arsenal-muted">{totalCount}</span>
              </button>
            </li>
            {typed && !isExact ? (
              <li role="option" aria-selected={value === typed}>
                <button
                  type="button"
                  className={optionClass(value === typed)}
                  onClick={() => choose(typed)}
                >
                  <CheckIcon visible={value === typed} />
                  <span className="flex-1 truncate">{substringLabel(typed)}</span>
                  <span className="tabular-nums text-arsenal-muted">
                    {facetSubstringCount(items, typed)}
                  </span>
                </button>
              </li>
            ) : null}
            {visible.map(([facet, count]) => (
              <li key={facet} role="option" aria-selected={value === facet}>
                <button
                  type="button"
                  className={optionClass(value === facet)}
                  onClick={() => choose(facet)}
                >
                  <CheckIcon visible={value === facet} />
                  <span className="flex-1 truncate">{facet}</span>
                  <span className="tabular-nums text-arsenal-muted">{count}</span>
                </button>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="px-2.5 py-2 text-sm text-arsenal-muted">{emptySearchLabel}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
