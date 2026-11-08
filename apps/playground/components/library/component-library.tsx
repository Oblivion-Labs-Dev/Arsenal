'use client';

import { UI_COMPONENT_CATALOG } from '@arsenal/ui';
import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ClayFlowTabs } from '@/components/library/clayflow-tabs';
import { ComponentCard } from '@/components/library/component-card';
import { BlueprintGallery, collections } from '@/components/ui-component-showcase';
import { categoriesWithCounts, filterEntries, type CategoryFilter } from '@/lib/catalog';

type LibraryTab = 'components' | 'clayflow' | 'patterns';
const TAB_LABEL: Record<LibraryTab, string> = {
  components: 'Components',
  clayflow: 'ClayFlow',
  patterns: 'Patterns',
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-arsenal-border-hover bg-arsenal-elevated text-arsenal-primary'
          : 'border-transparent text-arsenal-secondary hover:text-arsenal-primary'
      }`}
    >
      {children}
    </button>
  );
}

export function ComponentLibrary() {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<LibraryTab>('components');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');
  const categories = useMemo(() => categoriesWithCounts(), []);
  const results = useMemo(
    () => filterEntries(UI_COMPONENT_CATALOG, category, query),
    [category, query],
  );

  return (
    <div className="site-container">
      <header className="max-w-3xl pt-10">
        <div className="site-label">§ 01 · Components</div>
        <h1 className="site-title mt-3">Components</h1>
        <p className="site-lede mt-4">
          {UI_COMPONENT_CATALOG.length} components run here. Preview one, adjust its settings, and
          copy it into your project.
        </p>
      </header>

      <div className="sticky top-[calc(var(--site-header-h)+1.25rem)] z-30 mt-10">
        <div className="site-header flex flex-col gap-2 rounded-xl p-2 sm:flex-row sm:items-center">
          <div className="flex shrink-0 rounded-lg bg-arsenal-background p-1">
            {(['components', 'clayflow', 'patterns'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
                className="relative rounded-md px-3 py-1.5 text-sm font-medium"
              >
                {tab === value ? (
                  <motion.span
                    layoutId="library-tab"
                    className="absolute inset-0 rounded-md bg-arsenal-elevated"
                    transition={
                      reduced ? { duration: 0 } : { duration: 0.16, ease: [0.22, 1, 0.36, 1] }
                    }
                  />
                ) : null}
                <span
                  className={`relative ${tab === value ? 'text-arsenal-primary' : 'text-arsenal-secondary'}`}
                >
                  {TAB_LABEL[value]}
                </span>
              </button>
            ))}
          </div>
          {tab === 'components' ? (
            <label className="relative flex-1">
              <span className="sr-only">Filter components</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by name or purpose"
                className="h-10 w-full rounded-lg border border-arsenal-border bg-arsenal-background px-4 text-sm text-arsenal-primary outline-none transition-colors placeholder:text-arsenal-muted focus:border-arsenal-border-hover"
              />
            </label>
          ) : null}
        </div>
      </div>

      {tab === 'components' ? (
        <>
          <div className="site-scroll-x -mx-[var(--site-gutter)] mt-6 flex gap-1 px-[var(--site-gutter)]">
            <Chip active={category === 'all'} onClick={() => setCategory('all')}>
              All <span className="ml-1 text-arsenal-muted">{UI_COMPONENT_CATALOG.length}</span>
            </Chip>
            {categories.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label} <span className="ml-1 text-arsenal-muted">{c.count}</span>
              </Chip>
            ))}
          </div>

          {results.length === 0 ? (
            <div className="site-card mt-8 px-6 py-16 text-center">
              <p className="text-arsenal-primary">Nothing matches “{query}”.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                }}
                className="mt-4 text-sm text-arsenal-accent underline-offset-4 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <motion.div layout={!reduced} className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((entry) => (
                <ComponentCard key={entry.id} entry={entry} />
              ))}
            </motion.div>
          )}
        </>
      ) : tab === 'clayflow' ? (
        <ClayFlowTabs />
      ) : (
        <div className="mt-10 space-y-16">
          <section>
            <div className="site-label">§ 02 · Collections</div>
            <h2 className="mt-3 text-2xl font-medium text-arsenal-primary">
              Sets that belong together
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <article key={collection.title} className="site-card p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium text-arsenal-primary">{collection.title}</h3>
                    <span className="text-xs text-arsenal-secondary">{collection.tone}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-arsenal-secondary">
                    {collection.description}
                  </p>
                  <p className="mt-4 font-mono text-xs text-arsenal-secondary">
                    {collection.components.join(' · ')}
                  </p>
                </article>
              ))}
            </div>
          </section>
          <section>
            <BlueprintGallery />
          </section>
        </div>
      )}
    </div>
  );
}
