'use client';

import type { ComponentCatalogEntry } from '@arsenal/ui';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useCopy } from '@/components/copy-code-block';
import {
  ComponentPreview,
  copyBundleFor,
  defaultSettings,
} from '@/components/ui-component-showcase';
import { categoryLabel } from '@/lib/catalog';

/** Mounts children only once the element nears the viewport, so 55 live previews stay cheap. */
export function useNearViewport<T extends Element>(rootMargin = '300px') {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, rootMargin]);
  return { ref, near };
}

/** A fixed stage that scales any preview to fit, live but not interactive. */
export function PreviewStage({
  entry,
  className = 'h-52',
  interactive = false,
}: {
  entry: ComponentCatalogEntry;
  className?: string;
  interactive?: boolean;
}) {
  const { ref, near } = useNearViewport<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`site-stage relative flex items-center justify-center overflow-hidden ${className}`}
    >
      {near ? (
        <div
          className={`flex w-full max-w-full items-center justify-center px-6 ${
            interactive ? '' : 'pointer-events-none origin-center scale-[0.86] select-none'
          }`}
          aria-hidden={interactive ? undefined : true}
          // The App Router runs React 19, where `inert` is a real boolean (React 18 types lack it).
          {...({ inert: interactive ? undefined : true } as Record<string, unknown>)}
        >
          <ComponentPreview entry={entry} settings={defaultSettings} />
        </div>
      ) : (
        <div className="h-16 w-16 animate-pulse rounded-full bg-arsenal-elevated" />
      )}
    </div>
  );
}

export function ComponentCard({ entry }: { entry: ComponentCatalogEntry }) {
  const { state, copy } = useCopy();
  return (
    <article className="site-card group overflow-hidden" data-interactive>
      <PreviewStage entry={entry} />
        <div className="border-t border-arsenal-border px-4 pb-4 pt-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate text-[15px] font-semibold text-arsenal-primary">
              {entry.name}
            </h3>
            <span className="shrink-0 text-xs text-arsenal-secondary">
              {categoryLabel(entry.category)}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-[13px] text-arsenal-secondary">
            {entry.description}
          </p>
        </div>
      {/* Overlay link: live previews may contain their own <a>, which must not nest in this one. */}
      <Link
        href={`/components/${entry.id}`}
        aria-label={`Open ${entry.name}`}
        className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arsenal-accent"
      />
      <button
        type="button"
        onClick={() => copy(copyBundleFor(entry))}
        className={`absolute right-3 top-3 z-[2] rounded-full border border-arsenal-border bg-arsenal-surface px-3 py-1.5 text-xs font-medium opacity-0 shadow-sm transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100 ${
          state === 'failed' ? 'text-arsenal-danger' : 'text-arsenal-primary'
        }`}
      >
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
      </button>
    </article>
  );
}
