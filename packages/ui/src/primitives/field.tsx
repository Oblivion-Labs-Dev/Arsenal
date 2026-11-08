'use client';

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../lib/cn';

export interface FieldMessageProps {
  label?: ReactNode;
  hint?: ReactNode;
  /** Shown instead of the hint and marks the control invalid. */
  error?: ReactNode;
  wrapperClassName?: string;
}

/** Ids for the control and the message under it, so `aria-describedby` points at what is shown. */
export function fieldMessageIds(fieldId: string, hasError: boolean, hasHint: boolean) {
  const messageId = hasError ? `${fieldId}-error` : hasHint ? `${fieldId}-hint` : undefined;
  return { messageId, describedBy: messageId };
}

export interface FieldShellProps extends FieldMessageProps {
  htmlFor: string;
  children: ReactNode;
}

/** Label + control + hint/error, so every form reads the same. */
export function FieldShell({
  label,
  hint,
  error,
  wrapperClassName,
  htmlFor,
  children,
}: FieldShellProps) {
  const { messageId } = fieldMessageIds(htmlFor, Boolean(error), Boolean(hint));
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', wrapperClassName)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-sm font-medium text-arsenal-primary">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <span id={messageId} className="text-[13px] font-medium text-arsenal-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={messageId} className="text-[13px] text-arsenal-secondary">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

const controlBase = cn(
  'w-full min-w-0 rounded-arsenal-sm border border-arsenal-border bg-arsenal-surface px-3 text-sm text-arsenal-primary',
  'shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--arsenal-background)_40%,transparent)]',
  'outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-arsenal-muted',
  'hover:border-[var(--arsenal-border-hover)]',
  'focus-visible:border-arsenal-accent focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--arsenal-accent)_22%,transparent)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-[invalid=true]:border-arsenal-danger aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--arsenal-danger)_22%,transparent)]',
);

function useFieldId(id: string | undefined) {
  const autoId = useId();
  return id ?? autoId;
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldMessageProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, wrapperClassName, className, id, ...rest },
  ref,
) {
  const fieldId = useFieldId(id);
  const { describedBy } = fieldMessageIds(fieldId, Boolean(error), Boolean(hint));
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
      htmlFor={fieldId}
    >
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlBase, 'h-10', className)}
        {...rest}
      />
    </FieldShell>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldMessageProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, wrapperClassName, className, id, ...rest },
  ref,
) {
  const fieldId = useFieldId(id);
  const { describedBy } = fieldMessageIds(fieldId, Boolean(error), Boolean(hint));
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
      htmlFor={fieldId}
    >
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlBase, 'min-h-24 resize-y py-2.5 leading-relaxed', className)}
        {...rest}
      />
    </FieldShell>
  );
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldMessageProps;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, wrapperClassName, className, id, children, ...rest },
  ref,
) {
  const fieldId = useFieldId(id);
  const { describedBy } = fieldMessageIds(fieldId, Boolean(error), Boolean(hint));
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      wrapperClassName={wrapperClassName}
      htmlFor={fieldId}
    >
      <span className="relative block">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlBase, 'h-10 cursor-pointer appearance-none pr-9', className)}
          {...rest}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-arsenal-muted"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    </FieldShell>
  );
});

export type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type'
> & {
  value: string;
  onValueChange: (value: string) => void;
  wrapperClassName?: string;
  /** Accessible name of the clear button. */
  clearLabel?: string;
};

/** Search is the control people touch most, so it gets the extra affordances: icon, clear, Escape. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onValueChange,
    placeholder = 'Search…',
    wrapperClassName,
    className,
    clearLabel = 'Clear search',
    onKeyDown,
    ...rest
  },
  ref,
) {
  return (
    <div className={cn('relative min-w-0', wrapperClassName)}>
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-arsenal-muted"
        aria-hidden="true"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
      </span>
      <input
        ref={ref}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === 'Escape' && value) {
            event.preventDefault();
            onValueChange('');
          }
        }}
        className={cn(
          controlBase,
          'h-10 pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none',
          className,
        )}
        {...rest}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label={clearLabel}
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-arsenal-muted transition-colors hover:bg-arsenal-elevated hover:text-arsenal-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
});
