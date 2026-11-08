'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { nextTabIndex, tabId, tabPanelId, type TabOrientation } from './tab-keys';

export interface TabItem<Id extends string = string> {
  id: Id;
  label: ReactNode;
  /** Shown as a small badge when defined (0 included, since 0 is real information). */
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<Id extends string = string> {
  items: readonly TabItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  /** Accessible name of the tab list. */
  ariaLabel: string;
  /** Prefix for tab and panel ids; pair panels with `tabPanelId(idBase, id)`. Defaults to a generated id. */
  idBase?: string;
  orientation?: TabOrientation;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = { sm: 'min-h-8 px-3 text-xs', md: 'min-h-10 px-4 text-sm' } as const;

/**
 * Accessible in-page tabs: roving tabindex, arrow keys follow the visible order, Home/End jump to
 * the ends, disabled tabs are skipped and selection follows focus.
 */
export function Tabs<Id extends string = string>({
  items,
  value,
  onChange,
  ariaLabel,
  idBase,
  orientation = 'horizontal',
  size = 'md',
  className,
}: TabsProps<Id>) {
  const generated = useId();
  const base = idBase ?? generated;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(event.key, index, items.length, {
      orientation,
      isDisabled: (i) => Boolean(items[i]?.disabled),
    });
    if (next === null) return;
    event.preventDefault();
    const item = items[next];
    if (!item) return;
    onChange(item.id);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={cn(
        'max-w-full gap-1 border-arsenal-border',
        orientation === 'horizontal' ? 'flex overflow-x-auto border-b' : 'flex flex-col border-r',
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
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-medium transition-colors duration-150',
              'text-arsenal-secondary hover:text-arsenal-primary disabled:cursor-not-allowed disabled:opacity-40',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-arsenal-accent',
              orientation === 'horizontal'
                ? '-mb-px border-b-2 border-transparent'
                : '-mr-px justify-start border-r-2 border-transparent',
              selected && 'border-arsenal-accent text-arsenal-primary',
              sizeClasses[size],
            )}
          >
            {item.icon ? (
              <span aria-hidden="true" className="shrink-0">
                {item.icon}
              </span>
            ) : null}
            <span>{item.label}</span>
            {typeof item.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[0.68rem] font-semibold tabular-nums',
                  selected
                    ? 'bg-[color-mix(in_srgb,var(--arsenal-accent)_16%,transparent)] text-arsenal-accent'
                    : 'bg-arsenal-elevated text-arsenal-secondary',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
