'use client';

import { useId, useState } from 'react';
import { cn } from '../lib/cn';
import { alignHunkLines, diffTotals, type DiffLine, type FileDiff } from './diff';

export interface SideBySideDiffProps {
  readonly files: readonly FileDiff[];
  /** Overrides totals computed from `files`. */
  readonly stats?: { readonly additions: number; readonly deletions: number };
  readonly initialMode?: 'side-by-side' | 'unified';
  /** Column captions for the two sides. */
  readonly beforeLabel?: string;
  readonly afterLabel?: string;
  readonly emptyMessage?: string;
  /** Shows an "Open" action on files that carry a `target`. */
  readonly onOpenTarget?: (target: string) => void;
  readonly className?: string;
}

const LINE_TONE: Record<DiffLine['type'], string> = {
  context: '',
  addition: 'bg-[color-mix(in_srgb,var(--arsenal-success)_14%,transparent)]',
  deletion: 'bg-[color-mix(in_srgb,var(--arsenal-danger)_14%,transparent)]',
};

const STATUS_TONE: Record<FileDiff['status'], string> = {
  modified: 'text-arsenal-accent border-[color-mix(in_srgb,var(--arsenal-accent)_40%,transparent)]',
  added: 'text-arsenal-success border-[color-mix(in_srgb,var(--arsenal-success)_40%,transparent)]',
  deleted: 'text-arsenal-danger border-[color-mix(in_srgb,var(--arsenal-danger)_40%,transparent)]',
};

function Counts({ additions, deletions }: { additions: number; deletions: number }) {
  return (
    <span className="inline-flex gap-2 font-mono text-xs tabular-nums">
      <span className="text-arsenal-success" title="Added lines">
        +{additions}
      </span>
      <span className="text-arsenal-danger" title="Removed lines">
        -{deletions}
      </span>
    </span>
  );
}

function Cell({ line, side }: { line: DiffLine | null; side: 'old' | 'new' }) {
  const num = side === 'old' ? line?.oldLineNumber : line?.newLineNumber;
  return (
    <div
      className={cn(
        'flex min-w-0',
        line
          ? LINE_TONE[line.type]
          : 'bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--arsenal-border)_6px_7px)] opacity-60',
      )}
    >
      <span className="w-12 shrink-0 select-none pr-2 text-right text-arsenal-muted">
        {num ?? ''}
      </span>
      <pre className="m-0 min-w-0 flex-1 whitespace-pre-wrap break-all">{line?.content ?? ''}</pre>
    </div>
  );
}

const pill =
  'rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsenal-accent';
const pillActive =
  'border-arsenal-accent bg-[color-mix(in_srgb,var(--arsenal-accent)_14%,transparent)] text-arsenal-primary';
const pillIdle =
  'border-arsenal-border text-arsenal-secondary hover:border-arsenal-accent hover:text-arsenal-primary';

/** File-by-file code diff with a side-by-side or changes-only view and per-file filtering. */
export function SideBySideDiff({
  files,
  stats,
  initialMode = 'side-by-side',
  beforeLabel = 'Before',
  afterLabel = 'After',
  emptyMessage = 'No file changes.',
  onOpenTarget,
  className,
}: SideBySideDiffProps) {
  const [active, setActive] = useState<number | 'all'>('all');
  const [mode, setMode] = useState(initialMode);
  const idBase = useId();

  if (files.length === 0) {
    return (
      <div
        role="status"
        className={cn(
          'rounded-arsenal border border-arsenal-border bg-arsenal-surface p-6 text-sm text-arsenal-secondary',
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const shownFiles = active === 'all' ? files : files.slice(active, active + 1);
  const totals = stats ?? diffTotals(files);

  return (
    <div className={cn('flex flex-col gap-4 text-arsenal-primary', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">
            {files.length} changed {files.length === 1 ? 'file' : 'files'}
          </span>
          <Counts {...totals} />
        </div>
        <div
          role="group"
          aria-label="Diff layout"
          className="inline-flex rounded-full border border-arsenal-border bg-arsenal-surface p-0.5"
        >
          {(['side-by-side', 'unified'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition-colors',
                mode === m
                  ? 'bg-arsenal-elevated text-arsenal-primary shadow-sm'
                  : 'text-arsenal-secondary hover:text-arsenal-primary',
              )}
            >
              {m === 'side-by-side' ? 'Side by side' : 'Changes only'}
            </button>
          ))}
        </div>
      </div>

      {files.length > 1 && (
        <div role="tablist" aria-label="Files" className="flex flex-wrap gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={active === 'all'}
            onClick={() => setActive('all')}
            className={cn(pill, active === 'all' ? pillActive : pillIdle)}
          >
            All files ({files.length})
          </button>
          {files.map((file, idx) => (
            <button
              key={file.file}
              type="button"
              role="tab"
              aria-selected={active === idx}
              title={file.file}
              onClick={() => setActive(idx)}
              className={cn(
                pill,
                'inline-flex items-center gap-2',
                active === idx ? pillActive : pillIdle,
              )}
            >
              <span>{file.file.split('/').pop() ?? file.file}</span>
              <Counts additions={file.additions} deletions={file.deletions} />
            </button>
          ))}
        </div>
      )}

      {shownFiles.map((file, fileIdx) => {
        const headingId = `${idBase}-f${fileIdx}`;
        return (
          <section
            key={file.file}
            aria-labelledby={headingId}
            className="overflow-hidden rounded-arsenal border border-arsenal-border bg-arsenal-surface"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-arsenal-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wider',
                    STATUS_TONE[file.status],
                  )}
                >
                  {file.status}
                </span>
                <h3 id={headingId} className="m-0 truncate font-mono text-sm">
                  {file.file}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {file.target && onOpenTarget && (
                  <button
                    type="button"
                    onClick={() => onOpenTarget(file.target!)}
                    className="text-xs text-arsenal-accent hover:underline"
                  >
                    Open {file.target}
                  </button>
                )}
                <Counts additions={file.additions} deletions={file.deletions} />
              </div>
            </header>

            {mode === 'side-by-side' && (
              <div className="grid grid-cols-2 border-b border-arsenal-border text-xs text-arsenal-secondary">
                <div className="flex items-center gap-2 px-4 py-2">
                  <span aria-hidden className="size-2 rounded-full bg-arsenal-danger" />
                  {beforeLabel}
                </div>
                <div className="flex items-center gap-2 border-l border-arsenal-border px-4 py-2">
                  <span aria-hidden className="size-2 rounded-full bg-arsenal-success" />
                  {afterLabel}
                </div>
              </div>
            )}

            <div className="overflow-x-auto font-mono text-xs leading-5">
              {file.hunks.length === 0 ? (
                <p className="m-0 px-4 py-3 text-arsenal-secondary">
                  Binary file or no text changes.
                </p>
              ) : (
                file.hunks.map((hunk, hIdx) => (
                  <div key={hIdx}>
                    <div className="bg-[color-mix(in_srgb,var(--arsenal-accent)_8%,transparent)] px-4 py-1 text-arsenal-secondary">
                      {hunk.header}
                    </div>
                    {mode === 'side-by-side'
                      ? alignHunkLines(hunk.lines).map((row, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-2">
                            <Cell line={row.left} side="old" />
                            <div className="border-l border-arsenal-border">
                              <Cell line={row.right} side="new" />
                            </div>
                          </div>
                        ))
                      : hunk.lines.map((line, lIdx) => (
                          <div key={lIdx} className={cn('flex', LINE_TONE[line.type])}>
                            <span className="w-12 shrink-0 select-none pr-2 text-right text-arsenal-muted">
                              {line.oldLineNumber ?? ''}
                            </span>
                            <span className="w-12 shrink-0 select-none pr-2 text-right text-arsenal-muted">
                              {line.newLineNumber ?? ''}
                            </span>
                            <span
                              aria-hidden
                              className="w-4 shrink-0 select-none text-arsenal-secondary"
                            >
                              {line.type === 'addition'
                                ? '+'
                                : line.type === 'deletion'
                                  ? '-'
                                  : ' '}
                            </span>
                            <pre className="m-0 min-w-0 flex-1 whitespace-pre-wrap break-all">
                              {line.content}
                            </pre>
                          </div>
                        ))}
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
