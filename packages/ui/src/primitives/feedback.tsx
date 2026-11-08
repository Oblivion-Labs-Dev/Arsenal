'use client';

import { useEffect, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { StatePanel } from '../state-panel';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'title' | 'block';
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
}

const skeletonVariant: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-3 rounded-full',
  title: 'h-5 w-2/3 rounded-full',
  block: 'h-24 rounded-arsenal-sm',
};

/**
 * Shape-matched placeholder, so the layout holds still when data lands. The pulse is motion-safe:
 * with reduced motion the bar renders still, since the information is in the shape.
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-[color-mix(in_srgb,var(--arsenal-text-primary)_9%,var(--arsenal-surface))] motion-safe:animate-pulse',
        skeletonVariant[variant],
        className,
      )}
      style={{ width, height, ...style }}
      {...rest}
    />
  );
}

/** Text lines with a shorter last line, like a real paragraph. */
export function skeletonLineWidths(lines: number): string[] {
  const count = Number.isFinite(lines) ? Math.max(0, Math.floor(lines)) : 0;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 && count > 1 ? '60%' : '100%',
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {skeletonLineWidths(lines).map((width, index) => (
        <Skeleton key={index} width={width} />
      ))}
    </div>
  );
}

export type LoadingPlaceholderShape = 'panel' | 'list' | 'grid' | 'page';

export interface LoadingPlaceholderProps {
  /** Announced to screen readers, e.g. "Loading invoices". */
  label: string;
  /** panel: a card of lines. list: repeated rows. grid: tiles. page: a whole workspace stand-in. */
  shape?: LoadingPlaceholderShape;
  /** How many rows or tiles to stand in for. Ignored by `panel`. */
  rows?: number;
  className?: string;
}

const tile =
  'flex flex-col gap-2.5 rounded-arsenal border border-arsenal-border bg-arsenal-surface p-4';

/** One loading primitive for every surface; pick the shape of the content that is coming. */
export function LoadingPlaceholder({
  label,
  shape = 'panel',
  rows = 3,
  className,
}: LoadingPlaceholderProps) {
  const count = Math.max(1, Math.floor(rows));
  const status = { role: 'status', 'aria-busy': true, 'aria-label': label } as const;

  if (shape === 'panel') {
    return (
      <div {...status} className={cn(tile, 'gap-3', className)}>
        <span className="text-xs font-medium text-arsenal-secondary">{label}</span>
        <SkeletonText lines={3} />
      </div>
    );
  }

  const cells = Array.from({ length: count }, (_, index) => (
    <div key={index} className={tile} aria-hidden="true">
      <Skeleton width="45%" />
      <Skeleton width="85%" height="1.1rem" />
      <Skeleton width="60%" />
    </div>
  ));

  if (shape === 'page') {
    return (
      <div {...status} className={cn('flex flex-col gap-5', className)}>
        <div className="flex flex-col gap-2.5" aria-hidden="true">
          <Skeleton width="18%" />
          <Skeleton variant="title" width="42%" height="1.75rem" />
          <Skeleton width="55%" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={tile}>
              <Skeleton width="40%" />
              <Skeleton width="55%" height="1.6rem" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2" aria-hidden="true">
          {Array.from({ length: count }, (_, index) => (
            <div key={index} className={cn(tile, 'flex-row items-center justify-between')}>
              <Skeleton width="38%" />
              <Skeleton width="18%" />
            </div>
          ))}
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      {...status}
      className={cn(
        shape === 'grid'
          ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
          : 'flex flex-col gap-2',
        className,
      )}
    >
      {cells}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export interface ErrorStateProps {
  /** What broke, in the user's terms, e.g. "Your invoices". */
  title: string;
  description?: ReactNode;
  /** The caught error. It is reported once through `onReport` (console.error by default). */
  error?: (Error & { digest?: string }) | null;
  onRetry?: () => void;
  retryLabel?: string;
  /** A way out that isn't just "try again", such as a link back to a safe page. */
  fallback?: ReactNode;
  /** Where the error is reported. Errors are never swallowed silently. */
  onReport?: (error: Error & { digest?: string }) => void;
  referenceLabel?: string;
  className?: string;
}

/** The shared error-boundary screen: says what broke, keeps the reference, offers a way out. */
export function ErrorState({
  title,
  description,
  error,
  onRetry,
  retryLabel = 'Try again',
  fallback,
  onReport,
  referenceLabel = 'Reference',
  className,
}: ErrorStateProps) {
  useEffect(() => {
    if (!error) return;
    if (onReport) onReport(error);
    else console.error(`[${title}]`, error);
  }, [error, onReport, title]);

  const actions =
    onRetry || fallback ? (
      <>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-9 items-center justify-center rounded-full bg-arsenal-accent px-4 text-sm font-semibold text-arsenal-background transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-arsenal-surface"
          >
            {retryLabel}
          </button>
        ) : null}
        {fallback}
      </>
    ) : undefined;

  return (
    <StatePanel
      kind="error"
      title={title}
      className={className}
      description={
        <>
          {description}
          {error?.digest ? (
            <span className="mt-2 block font-mono text-xs text-arsenal-muted">
              {referenceLabel}: {error.digest}
            </span>
          ) : null}
        </>
      }
      action={actions}
    />
  );
}
