import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../lib/cn';
import { ChartDataTable } from './chart-data-table';
import { rectToPercent, squarify, type TreemapRect } from './treemap-layout';
import { useInViewActive } from './use-in-view-active';

const MAP_W = 100;
const MAP_H = 34;

/**
 * Tile background for a signed value: success for gains, danger for losses, mixed into the surface
 * by how far the value is toward `domain` (full strength at |value| >= domain). Unknown is null.
 */
export function treemapTileColor(value: number | null, domain = 0.03): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  const safeDomain = domain > 0 ? domain : 0.03;
  const intensity = Math.round(Math.min(1, Math.abs(value) / safeDomain) * 55);
  const tone = value >= 0 ? 'var(--arsenal-success)' : 'var(--arsenal-danger)';
  return `color-mix(in srgb, ${tone} ${intensity}%, var(--arsenal-surface))`;
}

/** What a tile has room for, in percent of the map: name and detail, name only, or nothing. */
export function treemapLabelLevel(width: number, height: number): 'detail' | 'name' | 'none' {
  if (width >= 12 && height >= 20) return 'detail';
  if (width >= 7 && height >= 10) return 'name';
  return 'none';
}

export type TreemapDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Spatial arrow-key focus: the nearest tile whose centre lies in `direction`, scored by distance
 * along the direction plus twice the sideways offset. Returns `from` when nothing lies that way.
 */
export function treemapMoveFocus(
  rects: readonly TreemapRect[],
  from: number,
  direction: TreemapDirection,
): number {
  const origin = rects[from];
  if (!origin) return from;
  const cx = origin.x + origin.width / 2;
  const cy = origin.y + origin.height / 2;
  let best = from;
  let bestScore = Number.POSITIVE_INFINITY;
  rects.forEach((rect, index) => {
    if (index === from || rect.width <= 0 || rect.height <= 0) return;
    const dx = rect.x + rect.width / 2 - cx;
    const dy = rect.y + rect.height / 2 - cy;
    const horizontal = direction === 'left' || direction === 'right';
    const primary = horizontal ? dx : dy;
    const secondary = Math.abs(horizontal ? dy : dx);
    const forward = direction === 'left' || direction === 'up' ? -primary : primary;
    if (forward <= 0) return;
    const score = forward + secondary * 2;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

const KEY_DIRECTION: Record<string, TreemapDirection> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export interface TreemapProps<T> {
  items: readonly T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  /** Tile area. Missing or non-positive weights fall back to an equal share. */
  getWeight?: (item: T) => number | undefined;
  /** Signed value that colours the tile (e.g. daily change as a fraction). `null` = unknown. */
  getValue: (item: T) => number | null;
  /** Display text for the value. Defaults to a signed percent of a fraction. */
  formatValue?: (value: number) => string;
  /** |value| at which colour reaches full strength. */
  domain?: number;
  /** Overrides the default success/danger colour scale. Return null for "unknown". */
  colorFor?: (value: number | null, item: T) => string | null;
  onSelect?: (item: T) => void;
  /** Accessible name for the map. */
  label: string;
  /** Hide the colour legend. */
  hideLegend?: boolean;
  className?: string;
}

const defaultFormat = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;

/** Squarified treemap with value colours, arrow-key navigation, a legend and a table fallback. */
export function Treemap<T>({
  items,
  getKey,
  getLabel,
  getWeight,
  getValue,
  formatValue = defaultFormat,
  domain = 0.03,
  colorFor,
  onSelect,
  label,
  hideLegend = false,
  className,
}: TreemapProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = useInViewActive(rootRef);
  const [focusIndex, setFocusIndex] = useState(0);

  const rects = useMemo(
    () =>
      squarify(
        items.map((item) => {
          const w = getWeight?.(item);
          return { weight: w !== undefined && Number.isFinite(w) && w > 0 ? w : undefined };
        }),
        MAP_W,
        MAP_H,
      ),
    [items, getWeight],
  );

  if (items.length === 0) {
    return (
      <p className={cn('m-0 text-sm text-[var(--arsenal-text-secondary)]', className)}>
        Nothing to show yet.
      </p>
    );
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = KEY_DIRECTION[event.key];
    if (!direction) return;
    event.preventDefault();
    const next = treemapMoveFocus(rects, index, direction);
    setFocusIndex(next);
    tileRefs.current[next]?.focus();
  };

  const valueText = (v: number | null) =>
    v === null || !Number.isFinite(v) ? 'unknown' : formatValue(v);

  return (
    <div
      ref={rootRef}
      className={cn('flex flex-col gap-2', className)}
      data-active={active || undefined}
    >
      <div
        role="group"
        aria-label={label}
        className="relative w-full overflow-hidden rounded-[var(--arsenal-radius)] border border-[var(--arsenal-border)] bg-[var(--arsenal-surface)]"
        style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}
      >
        {items.map((item, index) => {
          const rect = rects[index]!;
          const pos = rectToPercent(rect, MAP_W, MAP_H);
          const value = getValue(item);
          const bg = colorFor ? colorFor(value, item) : treemapTileColor(value, domain);
          const level = treemapLabelLevel((rect.width / MAP_W) * 100, (rect.height / MAP_H) * 100);
          const name = getLabel(item);
          return (
            <button
              key={getKey(item)}
              ref={(el) => {
                tileRefs.current[index] = el;
              }}
              type="button"
              tabIndex={index === focusIndex ? 0 : -1}
              aria-label={`${name}: ${valueText(value)}`}
              onClick={onSelect ? () => onSelect(item) : undefined}
              onFocus={() => setFocusIndex(index)}
              onKeyDown={(e) => onKeyDown(e, index)}
              data-unknown={bg === null || undefined}
              className={cn(
                'absolute flex flex-col items-start justify-start overflow-hidden border border-[var(--arsenal-background)] p-1.5 text-left text-[var(--arsenal-text-primary)]',
                'transition-[opacity,filter] duration-[var(--arsenal-duration-normal)] hover:brightness-110 focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--arsenal-accent)]',
                'motion-reduce:transition-none',
                active ? 'opacity-100' : 'opacity-0 motion-reduce:opacity-100',
              )}
              style={{
                ...pos,
                background:
                  bg ??
                  'repeating-linear-gradient(135deg, var(--arsenal-surface) 0 6px, var(--arsenal-elevated) 6px 12px)',
                transitionDelay: `${Math.min(index, 5) * 40}ms`,
              }}
            >
              {level !== 'none' ? (
                <span aria-hidden="true" className="truncate text-xs font-semibold">
                  {name}
                </span>
              ) : null}
              {level === 'detail' ? (
                <span
                  aria-hidden="true"
                  className="text-xs tabular-nums text-[var(--arsenal-text-secondary)]"
                >
                  {valueText(value)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {hideLegend || colorFor ? null : (
        <div
          aria-hidden="true"
          className="flex items-center gap-2 text-xs text-[var(--arsenal-text-secondary)]"
        >
          <span className="tabular-nums">{formatValue(-domain)}</span>
          <span
            className="h-2 w-32 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${treemapTileColor(-domain, domain)}, var(--arsenal-surface), ${treemapTileColor(domain, domain)})`,
            }}
          />
          <span className="tabular-nums">{formatValue(domain)}</span>
          <span className="ml-2 inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{
                background:
                  'repeating-linear-gradient(135deg, var(--arsenal-surface) 0 2px, var(--arsenal-elevated) 2px 4px)',
              }}
            />
            unknown
          </span>
        </div>
      )}
      <ChartDataTable
        caption={label}
        columns={['Name', 'Value']}
        rows={items.map((item) => [getLabel(item), valueText(getValue(item))])}
      />
    </div>
  );
}
