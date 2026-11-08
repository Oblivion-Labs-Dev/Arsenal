'use client';

import type { ComponentCatalogEntry } from '@arsenal/ui';
import Link from 'next/link';
import { useState } from 'react';
import { CopyCodeBlock, useCopy } from '@/components/copy-code-block';
import { ComponentCard } from '@/components/library/component-card';
import {
  ComponentPreview,
  PlaygroundPanel,
  copyBundleFor,
  defaultSettings,
  metaFor,
  type PlaygroundSettings,
} from '@/components/ui-component-showcase';
import { categoryLabel, relatedEntries } from '@/lib/catalog';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-arsenal-border py-5">
      <div className="site-label">{label}</div>
      <div className="mt-2.5 text-[14.5px] leading-relaxed text-arsenal-secondary">{children}</div>
    </div>
  );
}

export function ComponentDetail({ entry }: { entry: ComponentCatalogEntry }) {
  const [settings, setSettings] = useState<PlaygroundSettings>(defaultSettings);
  const [tuning, setTuning] = useState(false);
  const { state, copy } = useCopy();
  const meta = metaFor(entry);
  const related = relatedEntries(entry, 3);

  return (
    <div className="site-container">
      <nav aria-label="Breadcrumb" className="pt-8 text-sm text-arsenal-secondary">
        <Link href="/components" className="transition-colors hover:text-arsenal-primary">
          Components
        </Link>
        <span className="mx-2 text-arsenal-muted">/</span>
        <span>{categoryLabel(entry.category)}</span>
      </nav>

      <header className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="site-title">{entry.name}</h1>
          <p className="site-lede mt-3">{entry.description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setTuning((v) => !v)}
            aria-expanded={tuning}
            className="h-10 rounded-full border border-arsenal-border px-4 text-sm font-medium text-arsenal-primary transition-colors hover:border-arsenal-border-hover"
          >
            {tuning ? 'Hide controls' : 'Tune'}
          </button>
          <button
            type="button"
            onClick={() => copy(copyBundleFor(entry))}
            className="h-10 rounded-full bg-arsenal-accent px-5 text-sm font-semibold text-arsenal-background transition-opacity hover:opacity-90"
          >
            {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy component'}
          </button>
        </div>
      </header>

      <div className={`mt-8 grid gap-5 ${tuning ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        <section
          aria-label="Live preview"
          className="site-card site-stage flex min-h-[420px] items-center justify-center overflow-hidden p-8 sm:p-12"
        >
          <div className="w-full max-w-3xl">
            <ComponentPreview entry={entry} settings={settings} immersive />
          </div>
        </section>
        {tuning ? (
          <PlaygroundPanel
            entry={entry}
            settings={settings}
            onChange={setSettings}
            onClose={() => setTuning(false)}
          />
        ) : null}
      </div>

      <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Code">
          <h2 className="text-xl font-semibold tracking-tight text-arsenal-primary">Use it</h2>
          <div className="mt-4 rounded-arsenal border border-arsenal-border bg-arsenal-background px-4 py-3 font-mono text-[12.5px] text-arsenal-primary">
            {entry.importLine}
          </div>
          <CopyCodeBlock code={entry.code} className="mt-4" />
        </section>
        <aside>
          <Fact label="Props">
            {entry.props.length ? (
              <span className="font-mono text-[12.5px] text-arsenal-primary">
                {entry.props.join(', ')}
              </span>
            ) : (
              'None'
            )}
          </Fact>
          <Fact label="When to use">{entry.usage}</Fact>
          <Fact label="Accessibility">{entry.accessibility}</Fact>
          <Fact label="Performance">{entry.performance}</Fact>
          {meta.dependencies.length ? (
            <Fact label="Depends on">
              <span className="font-mono text-[12.5px]">{meta.dependencies.join(', ')}</span>
            </Fact>
          ) : null}
        </aside>
      </div>

      {related.length ? (
        <section className="mt-20" aria-label="Related components">
          <h2 className="text-xl font-semibold tracking-tight text-arsenal-primary">
            More in {categoryLabel(entry.category)}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => (
              <ComponentCard key={other.id} entry={other} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
