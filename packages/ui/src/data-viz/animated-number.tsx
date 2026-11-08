import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { useCountUp, type CountUpOptions } from './use-count-up';

export interface AnimatedNumberProps
  extends CountUpOptions, Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** The real figure. `null` renders `placeholder` and never animates. */
  value: number | null;
  /** Formats both the animated and the settled figure. Defaults to locale grouping, 2 decimals max. */
  format?: (value: number) => string;
  /** Shown instead of a number when the value is unknown. */
  placeholder?: string;
  /** Rendered after the number inside the same element (e.g. "%", "d"). */
  suffix?: string;
}

const defaultFormat = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

/**
 * A figure that counts to its value: up from 0 when it appears, then from what is on screen when
 * it changes. Screen readers only ever hear the settled value, not every intermediate number.
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  placeholder = '—',
  suffix = '',
  durationMs,
  delayMs,
  decimals,
  startFrom,
  className,
  ...rest
}: AnimatedNumberProps) {
  const shown = useCountUp(value, { durationMs, delayMs, decimals, startFrom });
  const base = cn('tabular-nums', className);
  if (value === null || !Number.isFinite(value) || shown === null) {
    return (
      <span {...rest} className={base} aria-label={value === null ? 'unknown' : undefined}>
        {placeholder}
      </span>
    );
  }
  return (
    <span {...rest} className={base} aria-label={`${format(value)}${suffix}`}>
      <span aria-hidden="true">
        {format(shown)}
        {suffix}
      </span>
    </span>
  );
}

/** Alias kept for code ported from apps that called it CountUp. */
export const CountUp = AnimatedNumber;
export type CountUpProps = AnimatedNumberProps;
