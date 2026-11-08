'use client';

import { type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface FilterChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'type'
> {
  label: string;
  active?: boolean;
  count?: number;
}

/** Toggleable filter pill. `aria-pressed` carries the state so it is never colour alone. */
export function FilterChip({ label, active = false, count, className, ...rest }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent focus-visible:ring-offset-1 focus-visible:ring-offset-arsenal-background',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'border-arsenal-accent bg-[color-mix(in_srgb,var(--arsenal-accent)_12%,transparent)] text-arsenal-accent'
          : 'border-arsenal-border bg-arsenal-surface text-arsenal-secondary hover:border-[var(--arsenal-border-hover)] hover:text-arsenal-primary',
        className,
      )}
      {...rest}
    >
      {label}
      {typeof count === 'number' ? (
        <span className="rounded-full bg-arsenal-elevated px-1.5 py-px text-[0.66rem] tabular-nums text-arsenal-secondary">
          {count}
        </span>
      ) : null}
    </button>
  );
}
