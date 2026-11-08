'use client';

import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type CardStatus = 'success' | 'active' | 'attention' | 'danger' | 'info' | 'neutral';
export type CardVariant = 'standard' | 'interactive' | 'status' | 'insight';
export type CardPadding = 'none' | 'compact' | 'default';

/** CSS colour for each status rail. Status is never colour alone: pair it with text in the card. */
export const cardStatusColor: Record<CardStatus, string> = {
  success: 'var(--arsenal-success)',
  active: 'var(--arsenal-accent)',
  attention: 'var(--arsenal-accent-amber, var(--arsenal-accent))',
  danger: 'var(--arsenal-danger)',
  info: 'var(--arsenal-accent-blue, var(--arsenal-accent))',
  neutral: 'var(--arsenal-border)',
};

export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** Only used by variant="status": paints the accent rail. */
  status?: CardStatus;
  padding?: CardPadding;
  selected?: boolean;
  /** Renders the card as a real button so keyboard users get activation for free. */
  onActivate?: () => void;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  compact: 'p-3',
  default: 'p-5',
};

/**
 * One card language with variants rather than ad-hoc rectangles: standard for content, interactive
 * for anything clickable, status for state-bearing rows and insight for generated context.
 */
export function Card({
  variant = 'standard',
  status = 'neutral',
  padding = 'default',
  selected = false,
  onActivate,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  const interactive = variant === 'interactive' || Boolean(onActivate);
  const classes = cn(
    'relative block w-full min-w-0 overflow-hidden rounded-arsenal border border-arsenal-border bg-arsenal-surface text-left text-arsenal-primary',
    'shadow-[0_1px_2px_color-mix(in_srgb,var(--arsenal-background)_30%,transparent),0_8px_24px_-12px_color-mix(in_srgb,var(--arsenal-background)_55%,transparent)]',
    interactive &&
      'cursor-pointer transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:border-[var(--arsenal-border-hover)] motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent focus-visible:ring-offset-2 focus-visible:ring-offset-arsenal-background',
    variant === 'status' &&
      'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--card-status)]',
    variant === 'insight' &&
      'border-[color-mix(in_srgb,var(--arsenal-accent)_30%,var(--arsenal-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--arsenal-accent)_8%,var(--arsenal-surface)),var(--arsenal-surface))]',
    selected && 'border-arsenal-accent shadow-[0_0_0_1px_var(--arsenal-accent)]',
    paddingClasses[padding],
    className,
  );
  const statusStyle =
    variant === 'status'
      ? { ['--card-status' as string]: cardStatusColor[status], ...style }
      : style;
  const statusAttr = variant === 'status' ? { 'data-status': status } : {};

  if (onActivate) {
    return (
      <button
        type="button"
        className={classes}
        style={statusStyle}
        onClick={onActivate}
        aria-pressed={selected || undefined}
        {...statusAttr}
        {...rest}
      >
        {children}
      </button>
    );
  }
  return (
    <div
      className={classes}
      style={statusStyle}
      data-selected={selected || undefined}
      {...statusAttr}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ eyebrow, title, action, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-arsenal-secondary">
            {eyebrow}
          </div>
        ) : null}
        {title ? (
          <div className="mt-0.5 text-base font-semibold leading-snug text-arsenal-primary">
            {title}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('text-sm leading-relaxed text-arsenal-secondary', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-end gap-2 border-t border-arsenal-border pt-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
