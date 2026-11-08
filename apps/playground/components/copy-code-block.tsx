'use client';

import { useState } from 'react';
import { cn } from '@arsenal/ui';
import { copyText } from '@/lib/copy';

type CopyState = 'idle' | 'copied' | 'failed';

export { copyText };

export function useCopy() {
  const [state, setState] = useState<CopyState>('idle');
  const copy = async (text: string) => {
    setState((await copyText(text)) ? 'copied' : 'failed');
    window.setTimeout(() => setState('idle'), 2000);
  };
  return { state, copy };
}

export function CopyCodeBlock({
  code,
  label = 'Copy code',
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const { state, copy } = useCopy();

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => copy(code)}
        className={cn(
          'absolute right-3 top-3 z-10 rounded-md border border-arsenal-border bg-arsenal-elevated px-3 py-1.5 text-xs font-medium transition-colors hover:border-arsenal-border-hover hover:text-arsenal-primary',
          state === 'failed' ? 'text-arsenal-danger' : 'text-arsenal-secondary',
        )}
      >
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
      </button>
      <pre
        data-lenis-prevent
        className="max-h-[460px] overflow-auto rounded-arsenal border border-arsenal-border bg-arsenal-background p-5 pt-14 font-mono text-[12.5px] leading-relaxed text-arsenal-secondary"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
