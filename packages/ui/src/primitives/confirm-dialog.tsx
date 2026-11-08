'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface ConfirmDialogProps {
  /** Element that opens the dialog (rendered via Radix `asChild`, so pass a single button). */
  trigger: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  busyLabel?: ReactNode;
  /** Return a promise to keep the dialog open (busy) until it settles; it closes on success. */
  onConfirm: () => void | Promise<void>;
  /** Externally controlled busy state. */
  busy?: boolean;
  /** Error from the last attempt, shown inside the dialog. */
  error?: ReactNode;
  tone?: 'danger' | 'accent';
}

/** Confirmation for destructive or irreversible actions. Focus is trapped and Escape cancels. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busyLabel = 'Working…',
  onConfirm,
  busy = false,
  error,
  tone = 'danger',
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const working = busy || pending;

  const confirm = async () => {
    setFailure(null);
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (cause) {
      // Surface the failure in the dialog instead of swallowing it.
      setFailure(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };

  const shownError = error ?? failure;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (working) return;
        setOpen(next);
        if (!next) setFailure(null);
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--arsenal-background)_70%,transparent)] backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2',
            'rounded-arsenal-lg border border-arsenal-border bg-arsenal-surface p-6 text-arsenal-primary',
            'shadow-[0_24px_60px_-20px_color-mix(in_srgb,var(--arsenal-background)_80%,black)] focus:outline-none',
          )}
        >
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-arsenal-secondary">
              {description}
            </Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {shownError ? (
            <p
              role="alert"
              className="mt-4 rounded-arsenal-sm border border-arsenal-danger bg-[color-mix(in_srgb,var(--arsenal-danger)_10%,transparent)] px-3 py-2 text-sm text-arsenal-danger"
            >
              {shownError}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={working}
                className="h-9 rounded-arsenal border border-arsenal-border bg-arsenal-surface px-4 text-sm font-medium text-arsenal-primary hover:border-[var(--arsenal-border-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={working}
              aria-busy={working || undefined}
              onClick={() => void confirm()}
              className={cn(
                'h-9 rounded-arsenal px-4 text-sm font-semibold text-arsenal-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-arsenal-surface disabled:opacity-50',
                tone === 'danger'
                  ? 'bg-arsenal-danger focus-visible:ring-arsenal-danger'
                  : 'bg-arsenal-accent focus-visible:ring-arsenal-accent',
              )}
            >
              {working ? busyLabel : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
