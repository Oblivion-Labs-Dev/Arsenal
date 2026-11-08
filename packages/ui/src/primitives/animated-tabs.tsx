'use client';

import { motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';
import { nextTabIndex, tabId, tabPanelId } from './tab-keys';
import { useReducedMotionGate } from './use-reduced-motion';

export interface AnimatedTabItem<Id extends string = string> {
  id: Id;
  label: ReactNode;
}

export interface AnimatedTabsProps<Id extends string = string> {
  items: readonly AnimatedTabItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  ariaLabel: string;
  idBase?: string;
  className?: string;
}

/** Which edges of a horizontal scroller have hidden content (1px tolerance for sub-pixel layout). */
export function scrollEdges(scrollLeft: number, clientWidth: number, scrollWidth: number) {
  return {
    start: scrollLeft > 1,
    end: scrollLeft + clientWidth < scrollWidth - 1,
  };
}

/** CSS mask that fades only the edges that hide content, so the bar never looks clipped. */
export function edgeFadeMask(
  edges: { start: boolean; end: boolean },
  fadePx = 32,
): string | undefined {
  if (!edges.start && !edges.end) return undefined;
  const left = edges.start ? `transparent 0, #000 ${fadePx}px` : '#000 0';
  const right = edges.end ? `#000 calc(100% - ${fadePx}px), transparent 100%` : '#000 100%';
  return `linear-gradient(to right, ${left}, ${right})`;
}

/**
 * Scrollable pill tabs whose highlight travels to the selected tab on a spring. Edges fade only
 * where more tabs are hidden. Reduced motion moves the highlight without animating it.
 */
export function AnimatedTabs<Id extends string = string>({
  items,
  value,
  onChange,
  ariaLabel,
  idBase,
  className,
}: AnimatedTabsProps<Id>) {
  const generated = useId();
  const base = idBase ?? generated;
  const reduced = useReducedMotionGate();
  const scroller = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const next = scrollEdges(el.scrollLeft, el.clientWidth, el.scrollWidth);
    setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);

  useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items.length]);

  // Keep the selected tab in view when it changes from outside.
  useEffect(() => {
    const index = items.findIndex((item) => item.id === value);
    refs.current[index]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [value, items, reduced]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(event.key, index, items.length);
    if (next === null) return;
    event.preventDefault();
    const item = items[next];
    if (!item) return;
    onChange(item.id);
    refs.current[next]?.focus();
  };

  const mask = edgeFadeMask(edges);

  return (
    <div
      ref={scroller}
      role="tablist"
      aria-label={ariaLabel}
      onScroll={measure}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      className={cn(
        'flex w-full max-w-full gap-1.5 overflow-x-auto rounded-arsenal-lg border border-arsenal-border bg-arsenal-elevated p-1.5',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={tabId(base, item.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tabPanelId(base, item.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative shrink-0 rounded-arsenal px-4 py-2 text-sm font-medium transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent',
              selected
                ? 'text-arsenal-primary'
                : 'text-arsenal-secondary hover:text-arsenal-primary',
            )}
          >
            {selected ? (
              <motion.span
                layoutId={`${base}-highlight`}
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 rounded-arsenal border',
                  'border-[color-mix(in_srgb,var(--arsenal-accent)_28%,var(--arsenal-border))]',
                  'bg-[linear-gradient(90deg,color-mix(in_srgb,var(--arsenal-accent)_14%,var(--arsenal-surface)),var(--arsenal-surface))]',
                  'shadow-[0_6px_18px_-8px_color-mix(in_srgb,var(--arsenal-accent)_45%,transparent)]',
                )}
                transition={
                  reduced ? { duration: 0 } : { type: 'spring', stiffness: 270, damping: 34 }
                }
              />
            ) : null}
            <span className="relative z-10 whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
