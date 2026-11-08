'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ForgeCore } from '@arsenal/fx';
import { UI_COMPONENT_CATALOG, UI_SETUP_SNIPPET } from '@arsenal/ui';
import { BestOfStrip } from '@/components/home/best-of-strip';
import { CountUp } from '@/components/home/count-up';
import { CopyCodeBlock } from '@/components/copy-code-block';
import { openPalette } from '@/components/site-command-palette';
import { ALL_PACKAGES, FEATURE_AREAS, MODULE_SHORTCUTS } from '@/lib/feature-catalog';

const STATS = [
  { label: 'Live components', value: UI_COMPONENT_CATALOG.length },
  { label: 'Modules', value: FEATURE_AREAS.length },
  { label: 'Packages', value: ALL_PACKAGES.length },
];

const STEPS = [
  { title: 'Browse', body: 'Search by name or category, or open the command palette with ⌘K.' },
  { title: 'Preview', body: 'Open a component to try it live and adjust its available settings.' },
  { title: 'Copy', body: 'Copy the component and its import directly from the detail page.' },
  { title: 'Use', body: 'Add it to your project and keep it aligned with your theme.' },
];

function Hero() {
  const reduced = useReducedMotion();
  return (
    <section
      aria-label="Arsenal"
      className="relative -mt-[calc(var(--site-header-h)+1.5rem)] flex min-h-[88svh] items-center overflow-hidden"
    >
      <motion.div
        aria-hidden
        className="site-mask-fade pointer-events-none absolute inset-y-0 right-0 w-[76%] lg:w-[68%]"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <ForgeCore focusX={0.55} focusY={0.5} scale={0.4} />
      </motion.div>
      {/* Keeps the hero copy readable where it overlaps the visual on narrow screens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_55%,var(--arsenal-background)_0%,transparent_65%)] lg:hidden"
      />
      <div className="site-container relative py-28">
        <div className="max-w-[38rem]">
          <div className="site-label">§ 00 · Arsenal</div>
          <h1 className="site-display mt-5 max-w-2xl">
            Live components and modules for your projects
          </h1>
          <p className="site-lede mt-6 max-w-xl">
            Browse themeable UI components and repository modules, try components in place, then
            copy what you need into your project.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/components"
              className="inline-flex h-11 items-center rounded-lg bg-arsenal-accent px-5 text-sm font-medium text-arsenal-background transition-opacity duration-150 hover:opacity-90"
            >
              Browse components
            </Link>
            <button
              type="button"
              onClick={openPalette}
              className="inline-flex h-11 items-center gap-3 rounded-lg border border-arsenal-border bg-arsenal-surface px-4 text-sm font-medium text-arsenal-primary transition-colors hover:border-arsenal-border-hover"
            >
              Search Arsenal
              <kbd className="site-kbd">⌘K</kbd>
            </button>
          </div>
          <dl className="mt-14 flex flex-wrap gap-x-10 gap-y-5 border-t border-arsenal-border pt-6">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dd className="text-2xl font-medium tabular-nums text-arsenal-primary">
                  <CountUp value={stat.value} />
                </dd>
                <dt className="mt-1 text-sm text-arsenal-secondary">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section aria-label="How to use Arsenal" className="site-container py-20">
      <div className="site-label">§ 02 · Using Arsenal</div>
      <div className="mt-3 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
        <h2 className="site-title max-w-xl">Browse, preview, and copy what your project needs</h2>
        <ol className="grid gap-x-10 sm:grid-cols-2">
          {STEPS.map((step) => (
            <li key={step.title} className="border-t border-arsenal-border py-5">
              <h3 className="text-base font-medium text-arsenal-primary">{step.title}</h3>
              <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-arsenal-secondary">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Modules() {
  const featured = MODULE_SHORTCUTS.map((slug) => FEATURE_AREAS.find((f) => f.slug === slug))
    .filter((f): f is (typeof FEATURE_AREAS)[number] => Boolean(f))
    .slice(0, 6);
  return (
    <section aria-label="Repository modules" className="site-container py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="site-label">§ 03 · Modules</div>
          <h2 className="site-title mt-3 max-w-2xl">Tools for the rest of the repository</h2>
          <p className="site-lede mt-4 max-w-xl">
            Setup, testing, CI, agent rules, context, documentation, and other repository tasks.
          </p>
        </div>
        <Link
          href="/modules"
          className="text-sm font-medium text-arsenal-accent transition-colors hover:text-arsenal-primary"
        >
          Browse all {FEATURE_AREAS.length} modules
        </Link>
      </div>
      <div className="mt-10 grid gap-x-5 gap-y-3 sm:grid-cols-2">
        {featured.map((feature) => (
          <Link
            key={feature.slug}
            href={`/modules/${feature.slug}`}
            className="site-card flex min-h-40 flex-col p-5"
          >
            <span className="font-mono text-xs text-arsenal-secondary">{feature.packages[0]}</span>
            <h3 className="mt-3 text-base font-medium text-arsenal-primary">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-arsenal-secondary">{feature.tagline}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section aria-label="Quick start" className="site-container py-20">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div>
          <div className="site-label">§ 04 · Quick start</div>
          <h2 className="site-title mt-3">Add Arsenal to a project</h2>
          <p className="site-lede mt-4">
            Add the UI package, import its styles and Tailwind preset, then use components that
            follow the project theme.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/components"
              className="inline-flex h-11 items-center rounded-lg bg-arsenal-accent px-5 text-sm font-medium text-arsenal-background transition-opacity duration-150 hover:opacity-90"
            >
              Browse components
            </Link>
            <Link
              href="/labs"
              className="inline-flex h-11 items-center rounded-lg border border-arsenal-border px-4 text-sm font-medium text-arsenal-primary transition-colors hover:border-arsenal-border-hover"
            >
              View labs
            </Link>
          </div>
        </div>
        <CopyCodeBlock code={UI_SETUP_SNIPPET} label="Copy setup" />
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <BestOfStrip />
      <HowItWorks />
      <Modules />
      <QuickStart />
    </>
  );
}
