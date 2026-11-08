'use client';

import { useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { acceptsFile, progressPercent } from './upload';

export interface UploadZoneProps {
  title: string;
  hint?: string;
  /** Accept list, e.g. ".pdf,.docx,image/*". Also enforced on drops. Empty accepts anything. */
  accept?: string;
  /**
   * Called with the chosen file. Report progress (0..1) through `onProgress`, or pass the
   * `progress` prop instead. A rejected promise is shown as an error under the zone.
   */
  onFile: (file: File, onProgress: (fraction: number) => void) => Promise<void> | void;
  /** Controlled progress (0..1) while uploading; `null` when idle. Overrides internal progress. */
  progress?: number | null;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

function UploadGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M12 17v-6M9 14l3-3 3 3" />
    </svg>
  );
}

/** Drop a file or click to choose one; shows progress while it travels and errors loudly. */
export function UploadZone({
  title,
  hint,
  accept = '',
  onFile,
  progress: controlledProgress,
  compact,
  disabled,
  className,
}: UploadZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [ownProgress, setOwnProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = controlledProgress !== undefined ? controlledProgress : ownProgress;
  const busy = progress !== null;

  const send = async (file: File | undefined) => {
    if (!file) return;
    if (!acceptsFile(file, accept)) {
      setError(`${file.name} is not a supported file type.`);
      return;
    }
    setError(null);
    setOwnProgress(0);
    try {
      await onFile(file, setOwnProgress);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The upload did not work.');
    } finally {
      setOwnProgress(null);
      if (input.current) input.current.value = '';
    }
  };

  const percent = busy ? progressPercent(progress) : 0;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <button
        type="button"
        disabled={busy || disabled}
        aria-busy={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy && !disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy && !disabled) void send(e.dataTransfer.files[0]);
        }}
        className={cn(
          'relative flex w-full items-center gap-3 overflow-hidden rounded-arsenal border border-dashed text-left transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent disabled:cursor-default',
          compact ? 'px-3 py-2.5' : 'px-4 py-5',
          dragging
            ? 'border-arsenal-accent bg-[color-mix(in_srgb,var(--arsenal-accent)_8%,transparent)]'
            : 'border-arsenal-border hover:border-arsenal-accent hover:bg-arsenal-surface',
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-arsenal-sm bg-arsenal-surface text-arsenal-secondary">
          {busy ? (
            <span
              className="size-4 animate-spin rounded-full border-2 border-arsenal-border border-t-arsenal-accent motion-reduce:animate-none"
              aria-hidden
            />
          ) : (
            <UploadGlyph />
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-arsenal-primary">
            {busy ? `Uploading… ${percent}%` : title}
          </span>
          {hint ? <span className="text-[13px] text-arsenal-secondary">{hint}</span> : null}
        </span>
        {busy ? (
          <span
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="absolute inset-x-0 bottom-0 h-0.5 bg-arsenal-border"
          >
            <span
              className="block h-full origin-left bg-arsenal-accent transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${percent / 100})` }}
            />
          </span>
        ) : null}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept || undefined}
        className="hidden"
        onChange={(e) => void send(e.target.files?.[0])}
      />
      {error ? (
        <p role="alert" className="m-0 text-[13px] text-arsenal-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
