import type { Metadata } from 'next';
import Link from 'next/link';
import { ALL_PACKAGES, FEATURE_AREAS } from '@/lib/feature-catalog';

export const metadata: Metadata = {
  title: 'Modules',
  description: 'What each Arsenal module does and which package to import for it.',
};

export default function ModulesPage() {
  return (
    <div className="site-container">
      <header className="max-w-3xl pt-10">
        <div className="site-label">§ 03 · Modules</div>
        <h1 className="site-title mt-3">Modules</h1>
        <p className="site-lede mt-4">
          {FEATURE_AREAS.length} areas across {ALL_PACKAGES.length} packages. Find a module for a
          repository task and see which package to import.
        </p>
      </header>
      <ol className="mt-12 grid gap-4 sm:grid-cols-2">
        {FEATURE_AREAS.map((feature) => (
          <li key={feature.slug}>
            <Link
              href={`/modules/${feature.slug}`}
              className="site-card group flex h-full flex-col p-6"
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate font-mono text-xs text-arsenal-secondary">
                  {feature.packages[0]}
                  {feature.packages.length > 1 ? ` +${feature.packages.length - 1}` : ''}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-medium text-arsenal-primary">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-arsenal-secondary">
                {feature.tagline}
              </p>
              <span className="mt-auto pt-6 text-sm font-medium text-arsenal-accent">
                View module
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
