import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { deltaText, type DeltaKind, type DeltaTextOptions } from './math';

export interface DeltaPillProps
  extends DeltaTextOptions, Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Signed change. `pct` values are fractions (0.012 is +1.2%). `null` means no data. */
  value: number | null;
  kind?: DeltaKind;
  /** Spoken before the change, e.g. "Today". */
  label?: string;
  /** Text when the value is unknown. */
  unknownText?: string;
}

const toneClass = {
  up: 'text-[var(--arsenal-success)] bg-[color-mix(in_srgb,var(--arsenal-success)_12%,transparent)]',
  down: 'text-[var(--arsenal-danger)] bg-[color-mix(in_srgb,var(--arsenal-danger)_12%,transparent)]',
  muted:
    'text-[var(--arsenal-text-secondary)] bg-[color-mix(in_srgb,var(--arsenal-muted)_12%,transparent)]',
} as const;

/** Signed change with an arrow and colour, plus words for screen readers ("up 1.2 percent"). */
export function DeltaPill({
  value,
  kind = 'pct',
  label,
  unknownText = 'no change data',
  currency,
  locale,
  className,
  ...rest
}: DeltaPillProps) {
  const base =
    'inline-flex min-h-6 items-center rounded-full px-2 text-[0.82em] font-semibold tabular-nums';
  if (value === null || !Number.isFinite(value)) {
    return (
      <span {...rest} className={cn(base, toneClass.muted, className)} data-tone="muted">
        {unknownText}
      </span>
    );
  }
  const text = deltaText(value, kind, { currency, locale });
  return (
    <span
      {...rest}
      className={cn(base, toneClass[text.tone], className)}
      data-tone={text.tone}
      aria-label={`${label ? `${label}: ` : ''}${text.spoken}`}
    >
      <span aria-hidden="true">
        {text.arrow ? `${text.arrow} ` : ''}
        {text.visible}
      </span>
    </span>
  );
}
