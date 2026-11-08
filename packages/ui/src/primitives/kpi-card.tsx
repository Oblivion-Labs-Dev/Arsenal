'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';
import { useReducedMotionGate } from './use-reduced-motion';

export type KpiAccent =
  'accent' | 'amber' | 'blue' | 'cyan' | 'gold' | 'violet' | 'success' | 'danger';

export const kpiAccentColor: Record<KpiAccent, string> = {
  accent: 'var(--arsenal-accent)',
  amber: 'var(--arsenal-accent-amber, var(--arsenal-accent))',
  blue: 'var(--arsenal-accent-blue, var(--arsenal-accent))',
  cyan: 'var(--arsenal-accent-cyan, var(--arsenal-accent))',
  gold: 'var(--arsenal-accent-gold, var(--arsenal-accent))',
  violet: 'var(--arsenal-accent-violet, var(--arsenal-accent))',
  success: 'var(--arsenal-success)',
  danger: 'var(--arsenal-danger)',
};

/**
 * Splits a plain figure ("42", "3.5", "87%") into a number to count up to. Anything else
 * ("1,204", "$3k", "n/a") returns null and is shown as-is, never re-interpreted.
 */
export function parseCountableFigure(
  value: string,
): { target: number; decimals: number; suffix: string } | null {
  const match = /^(\d+(?:\.\d+)?)(%?)$/.exec(value.trim());
  if (!match || match[1] === undefined) return null;
  const digits = match[1];
  const dot = digits.indexOf('.');
  return {
    target: Number(digits),
    decimals: dot === -1 ? 0 : digits.length - dot - 1,
    suffix: match[2] ?? '',
  };
}

function useCountUp(display: string, durationMs: number, delayMs: number): string {
  const reduced = useReducedMotionGate();
  const parsed = parseCountableFigure(display);
  const [shown, setShown] = useState(display);

  useEffect(() => {
    if (!parsed || reduced || typeof requestAnimationFrame === 'undefined') {
      setShown(display);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now + delayMs;
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(`${(parsed.target * eased).toFixed(parsed.decimals)}${parsed.suffix}`);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // parsed is derived from display.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, reduced, durationMs, delayMs]);

  return shown;
}

export interface KpiInsight {
  eyebrow?: ReactNode;
  headline: ReactNode;
  detail?: ReactNode;
  rows?: readonly { label: ReactNode; value: ReactNode }[];
}

export interface KpiLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export interface KpiCardProps {
  label: ReactNode;
  /** null renders an em dash: unknown stays visibly unknown, never 0. */
  value: string | number | null;
  icon?: ReactNode;
  accent?: KpiAccent;
  hint?: ReactNode;
  /** 0–1 progress meter under the value; clamped. */
  meter?: number;
  /** Back panel revealed on hover, focus or click. */
  insight?: KpiInsight;
  action?: { href: string; label: ReactNode };
  /** Router link for `action` (e.g. Next.js Link). Defaults to a plain anchor. */
  linkComponent?: ComponentType<KpiLinkProps>;
  /** Count-up start delay in ms, for staggering a row of cards. */
  delay?: number;
  /** Label of the button that opens the insight panel. */
  detailsLabel?: ReactNode;
  className?: string;
}

function DefaultLink({ href, className, children }: KpiLinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/** KPI tile with count-up, accent pool of light and an optional insight panel that slides in. */
export function KpiCard({
  label,
  value,
  icon,
  accent = 'accent',
  hint,
  meter,
  insight,
  action,
  linkComponent: Link = DefaultLink,
  delay = 0,
  detailsLabel = 'Details',
  className,
}: KpiCardProps) {
  const display = value === null ? '—' : String(value);
  const shown = useCountUp(display, 900, delay);
  const reduced = useReducedMotionGate();
  const [flipped, setFlipped] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const ratio = meter === undefined ? null : Math.min(1, Math.max(0, meter));
  const color = kpiAccentColor[accent];
  const transition = reduced
    ? 'none'
    : 'transform 420ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease';
  const interactive = Boolean(insight);

  return (
    <div
      ref={root}
      style={{ ['--kpi-accent' as string]: color } as CSSProperties}
      onMouseEnter={interactive ? () => setFlipped(true) : undefined}
      onMouseLeave={interactive ? () => setFlipped(false) : undefined}
      onFocus={interactive ? () => setFlipped(true) : undefined}
      onBlur={
        interactive
          ? (event) => {
              if (!root.current?.contains(event.relatedTarget as Node | null)) setFlipped(false);
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Escape') setFlipped(false);
            }
          : undefined
      }
      className={cn(
        'relative isolate overflow-hidden rounded-arsenal-lg border border-arsenal-border bg-arsenal-surface',
        'shadow-[0_1px_2px_color-mix(in_srgb,var(--arsenal-background)_30%,transparent),0_10px_30px_-14px_color-mix(in_srgb,var(--kpi-accent)_35%,transparent)]',
        className,
      )}
    >
      {/* Pool of light in the accent colour. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 -z-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--kpi-accent)_22%,transparent),transparent_70%)]"
      />
      <div
        className="p-5"
        style={{
          transform: flipped ? 'translateX(-18%)' : 'translateX(0)',
          opacity: flipped ? 0.35 : 1,
          transition,
        }}
        aria-hidden={flipped || undefined}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-arsenal-secondary">
            {label}
          </span>
          {icon ? (
            <span aria-hidden="true" className="text-[var(--kpi-accent)]">
              {icon}
            </span>
          ) : null}
        </div>
        <div
          className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-arsenal-primary [text-shadow:0_1px_0_color-mix(in_srgb,var(--arsenal-surface)_60%,transparent),0_6px_18px_color-mix(in_srgb,var(--kpi-accent)_25%,transparent)]"
          aria-label={display}
        >
          <span aria-hidden="true">{shown}</span>
        </div>
        {ratio !== null ? (
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-arsenal-elevated"
          >
            <div
              className="h-full rounded-full bg-[var(--kpi-accent)] motion-safe:transition-[width] motion-safe:duration-700"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        ) : null}
        {hint ? <p className="mt-2 text-sm text-arsenal-secondary">{hint}</p> : null}
        {insight ? (
          <button
            type="button"
            aria-expanded={flipped}
            aria-controls={panelId}
            onClick={() => setFlipped((f) => !f)}
            className="mt-3 text-xs font-medium text-arsenal-secondary underline-offset-2 hover:text-arsenal-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent"
          >
            {detailsLabel}
          </button>
        ) : null}
      </div>

      {insight ? (
        <div
          id={panelId}
          role="region"
          aria-hidden={!flipped}
          className="absolute inset-0 flex flex-col overflow-y-auto border-l border-[color-mix(in_srgb,var(--kpi-accent)_35%,var(--arsenal-border))] bg-arsenal-surface p-5"
          style={{
            transform: flipped ? 'translateX(0)' : 'translateX(100%)',
            opacity: flipped ? 1 : 0,
            transition,
            visibility: flipped ? 'visible' : 'hidden',
          }}
        >
          {insight.eyebrow ? (
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kpi-accent)]">
              {insight.eyebrow}
            </span>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-arsenal-primary">{insight.headline}</p>
          {insight.detail ? (
            <p className="mt-1.5 text-sm text-arsenal-secondary">{insight.detail}</p>
          ) : null}
          {insight.rows && insight.rows.length > 0 ? (
            <dl className="mt-3 space-y-1 text-sm">
              {insight.rows.map((row, index) => (
                <div key={index} className="flex justify-between gap-3">
                  <dt className="text-arsenal-secondary">{row.label}</dt>
                  <dd className="tabular-nums text-arsenal-primary">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {action ? (
            <Link
              href={action.href}
              className="mt-auto pt-3 text-sm font-semibold text-[var(--kpi-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent"
            >
              {action.label}
            </Link>
          ) : null}
        </div>
      ) : action ? (
        <div className="px-5 pb-4">
          <Link
            href={action.href}
            className="text-sm font-semibold text-[var(--kpi-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent"
          >
            {action.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
