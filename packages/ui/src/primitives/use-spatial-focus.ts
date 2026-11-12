'use client';

import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  resolveSpatialMove,
  SPATIAL_DOM_MIN_FORWARD,
  spatialDirectionForKey,
  type SpatialDirection,
  type SpatialNode,
  type SpatialScoreOptions,
} from './spatial-focus';

const ITEM = '[data-spatial-item]';
const REGION = '[data-spatial-region]';
const ROOT = '';

/** Focus memory kept across unmounts for hooks given the same `restoreKey` (e.g. a TV home row). */
const persisted = new Map<string, Map<string, string>>();

export interface UseSpatialFocusOptions extends SpatialScoreOptions {
  /** Turn the key handling off without unmounting. Default true. */
  enabled?: boolean;
  /** Keep the last focused item per region under this key, so a remount restores it. */
  restoreKey?: string;
  /** Focus the remembered (or first) item on mount. Default false. */
  autoFocus?: boolean;
  /** One tab stop for the whole container (roving tabindex). Default true. */
  roving?: boolean;
  /**
   * Enter on an item that does not activate natively (a tile `div`, not a button or link). Default
   * clicks the element so its click handler runs.
   */
  onActivate?: (id: string, element: HTMLElement) => void;
  /** A move found nothing in that direction (e.g. open a side panel from the left edge). */
  onEdge?: (direction: SpatialDirection, fromId: string) => void;
}

export interface SpatialFocusApi<T extends HTMLElement> {
  /** Attach to the container that holds the `data-spatial-item` elements. */
  ref: RefObject<T | null>;
  /** Focuses an item by its `data-spatial-item` value. Returns false if it is missing. */
  focus: (id: string) => boolean;
  /** Moves from the focused (or remembered) item. Returns the new id, or null at an edge. */
  move: (direction: SpatialDirection) => string | null;
  /** Focuses the remembered item, or the first one. Returns false when there is none. */
  restore: () => boolean;
}

interface Snapshot {
  nodes: SpatialNode[];
  elements: Map<string, HTMLElement>;
  idOf: Map<Element, string>;
}

function snapshot(container: HTMLElement): Snapshot {
  const nodes: SpatialNode[] = [];
  const elements = new Map<string, HTMLElement>();
  const idOf = new Map<Element, string>();
  const unique = (raw: string | null, fallback: string) => {
    let id = raw || fallback;
    for (let n = 2; elements.has(id); n++) id = `${raw || fallback}~${n}`;
    return id;
  };
  const regions = Array.from(container.querySelectorAll<HTMLElement>(REGION));
  regions.forEach((el, i) => {
    const id = `region:${unique(el.getAttribute('data-spatial-region'), String(i))}`;
    elements.set(id, el);
    idOf.set(el, id);
  });
  const parentOf = (el: Element) => {
    const region = el.parentElement?.closest(REGION);
    return region && region !== container && container.contains(region)
      ? (idOf.get(region) ?? null)
      : null;
  };
  const rectOf = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  };
  for (const el of regions) {
    nodes.push({ id: idOf.get(el)!, rect: rectOf(el), parent: parentOf(el), region: true });
  }
  container.querySelectorAll<HTMLElement>(ITEM).forEach((el, i) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;
    const id = unique(el.getAttribute('data-spatial-item'), `item-${i}`);
    elements.set(id, el);
    idOf.set(el, id);
    nodes.push({ id, rect: rectOf(el), parent: parentOf(el) });
  });
  return { nodes, elements, idOf };
}

const NATIVE = 'button, a[href], input, select, textarea, summary, [contenteditable="true"]';
const isTextEntry = (el: Element) =>
  el.matches('input:not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select') ||
  (el as HTMLElement).isContentEditable;

/**
 * D-pad / arrow-key focus for grids, irregular layouts and nested regions. Mark focus targets
 * with `data-spatial-item="id"` and groups with `data-spatial-region="id"` inside the container.
 * Arrows move to the nearest item in that direction (falling back to neighbouring regions),
 * Enter activates non-native tiles, the container keeps one tab stop, and the last focused item
 * per region is remembered: re-entering a region, a remount with `restoreKey`, or the focused item
 * being removed all restore focus instead of dropping it to the page.
 */
export function useSpatialFocus<T extends HTMLElement = HTMLElement>(
  options: UseSpatialFocusOptions = {},
): SpatialFocusApi<T> {
  const ref = useRef<T | null>(null);
  const opts = useRef(options);
  opts.current = options;
  const { enabled = true, restoreKey, autoFocus = false, roving = true } = options;

  const memory = useMemo(() => {
    if (!restoreKey) return new Map<string, string>();
    let saved = persisted.get(restoreKey);
    if (!saved) persisted.set(restoreKey, (saved = new Map()));
    return saved;
  }, [restoreKey]);

  const syncTabStops = useCallback(
    (snap: Snapshot) => {
      if (!roving) return;
      const active = memory.get(ROOT);
      const first = snap.nodes.find((n) => !n.region)?.id;
      const stop = active && snap.elements.has(active) ? active : first;
      for (const n of snap.nodes) {
        if (!n.region) snap.elements.get(n.id)!.tabIndex = n.id === stop ? 0 : -1;
      }
    },
    [memory, roving],
  );

  const focus = useCallback((id: string) => {
    const container = ref.current;
    if (!container) return false;
    const el = snapshot(container).elements.get(id);
    if (!el || el.matches(REGION)) return false;
    el.focus();
    return document.activeElement === el;
  }, []);

  const restore = useCallback(() => {
    const container = ref.current;
    if (!container) return false;
    const snap = snapshot(container);
    const remembered = memory.get(ROOT);
    const id =
      remembered && snap.elements.has(remembered)
        ? remembered
        : snap.nodes.find((n) => !n.region)?.id;
    return id ? focus(id) : false;
  }, [focus, memory]);

  const move = useCallback(
    (direction: SpatialDirection) => {
      const container = ref.current;
      if (!container) return null;
      const snap = snapshot(container);
      const activeItem = document.activeElement?.closest(ITEM);
      const from =
        (activeItem && container.contains(activeItem) ? snap.idOf.get(activeItem) : undefined) ??
        memory.get(ROOT);
      if (!from || !snap.elements.has(from)) return restore() ? (memory.get(ROOT) ?? null) : null;
      const { sideWeight, minForward = SPATIAL_DOM_MIN_FORWARD } = opts.current;
      const next = resolveSpatialMove(snap.nodes, from, direction, {
        sideWeight,
        minForward,
        memory,
      });
      if (next) snap.elements.get(next)?.focus();
      else opts.current.onEdge?.(direction, from);
      return next;
    },
    [memory, restore],
  );

  useEffect(() => {
    const container = ref.current;
    if (!container || !enabled) return undefined;
    let lastFocused: HTMLElement | null = null;
    let lastRect: DOMRect | null = null;

    const onFocusIn = (event: FocusEvent) => {
      const item = (event.target as Element | null)?.closest?.(ITEM);
      if (!item || !container.contains(item)) return;
      const snap = snapshot(container);
      const id = snap.idOf.get(item);
      if (!id) return;
      memory.set(ROOT, id);
      for (let parent = snap.nodes.find((n) => n.id === id)?.parent ?? null; parent;) {
        memory.set(parent, id);
        parent = snap.nodes.find((n) => n.id === parent)?.parent ?? null;
      }
      lastFocused = item as HTMLElement;
      lastRect = item.getBoundingClientRect();
      syncTabStops(snap);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      const item = target.closest(ITEM) as HTMLElement | null;
      if (!item || !container.contains(item)) return;
      const direction = spatialDirectionForKey(event.key);
      if (direction) {
        if (event.shiftKey || isTextEntry(target)) return;
        event.preventDefault();
        move(direction);
        return;
      }
      if (event.key === 'Enter' && target === item && !item.matches(NATIVE)) {
        event.preventDefault();
        const id = snapshot(container).idOf.get(item);
        if (id && opts.current.onActivate) opts.current.onActivate(id, item);
        else item.click();
      }
    };

    // A focused item that disappears (list refresh, filtered out) hands focus to its nearest
    // neighbour instead of dropping it to <body>.
    const observer =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            const snap = snapshot(container);
            syncTabStops(snap);
            if (!lastFocused || lastFocused.isConnected || !lastRect) return;
            const active = document.activeElement;
            if (active && active !== document.body && active.isConnected) return;
            const origin = lastRect;
            let best: string | null = null;
            let bestDistance = Number.POSITIVE_INFINITY;
            for (const n of snap.nodes) {
              if (n.region || n.rect.width <= 0) continue;
              const d = Math.hypot(n.rect.x - origin.left, n.rect.y - origin.top);
              if (d < bestDistance) {
                bestDistance = d;
                best = n.id;
              }
            }
            lastFocused = null;
            if (best) snap.elements.get(best)?.focus();
          });

    container.addEventListener('focusin', onFocusIn);
    container.addEventListener('keydown', onKeyDown);
    observer?.observe(container, { childList: true, subtree: true });
    syncTabStops(snapshot(container));
    if (autoFocus) restore();
    return () => {
      container.removeEventListener('focusin', onFocusIn);
      container.removeEventListener('keydown', onKeyDown);
      observer?.disconnect();
    };
  }, [enabled, autoFocus, memory, move, restore, syncTabStops]);

  return { ref, focus, move, restore };
}
