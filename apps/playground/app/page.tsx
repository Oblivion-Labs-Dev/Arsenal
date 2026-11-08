'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ForgeCore } from '@arsenal/fx';
import { UI_COMPONENT_CATALOG, UI_SETUP_SNIPPET } from '@arsenal/ui';
import { BestOfStrip } from '@/components/home/best-of-strip';
import { CountUp } from '@/components/home/count-up';
import { CopyCodeBlock } from '@/components/copy-code-block';
import { openPalette } from '@/components/site-command-palette';
import { ALL_PACKAGES, FEATURE_AREAS, MODULE_SHORTCUTS } from '@/lib/feature-catalog';

const EASE = [0.22, 1, 0.36, 1] as const;

const STATS = [
  { label: 'Live components', value: UI_COMPONENT_CATALOG.length },
  { label: 'Modules', value: FEATURE_AREAS.length },
  { label: 'Packages', value: ALL_PACKAGES.length },
];

const STEPS = [
  { title: 'Find', body: 'Search the vault with ⌘K or browse by category.' },
  { title: 'Try', body: 'Every component runs live. Tune its props in place.' },
  { title: 'Copy', body: 'One click copies the component and its import.' },
  { title: 'Ship', body: 'Drop it in. It follows your theme, light or dark.' },
];

function Hero() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const visualY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 120]);
  const visualOpacity = useTransform(scrollYProgress, [0, 0.85], [1, reduced ? 1 : 0.15]);
  const item = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: EASE },
  });

  return (
    <section
      ref={ref}
      aria-label="Arsenal"
      className="relative -mt-[calc(var(--site-header-h)+1.5rem)] flex min-h-[100svh] items-center overflow-hidden"
    >
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ y: visualY, opacity: visualOpacity }}
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: EASE }}
      >
        <ForgeCore focusX={0.7} focusY={0.52} scale={0.4} />
      </motion.div>
      {/* Keeps the headline readable where it overlaps the visual on narrow screens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_55%,var(--arsenal-background)_0%,transparent_55%)] lg:opacity-70"
      />

      <div className="site-container relative pt-[calc(var(--site-header-h)+3rem)] pb-16">
        <div className="max-w-2xl">
          <motion.div {...item(0.1)} className="site-label">
            The developer weapons vault
          </motion.div>
          <motion.h1 {...item(0.2)} className="site-display mt-5">
            Build with parts
            <br />
            that are already <span className="text-arsenal-accent">forged.</span>
          </motion.h1>
          <motion.p {...item(0.32)} className="site-lede mt-6 max-w-xl">
            Arsenal is a vault of live, themeable components and repository modules. Find what you
            need, try it in place, copy it into your project.
          </motion.p>
          <motion.div {...item(0.44)} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/components"
              className="inline-flex h-11 items-center rounded-full bg-arsenal-accent px-6 text-sm font-semibold text-arsenal-background transition-opacity hover:opacity-90"
            >
              Browse components
            </Link>
            <button
              type="button"
              onClick={openPalette}
              className="inline-flex h-11 items-center gap-3 rounded-full border border-arsenal-border bg-arsenal-surface px-5 text-sm font-medium text-arsenal-primary transition-colors hover:border-arsenal-border-hover"
            >
              Search the vault
              <kbd className="site-kbd">⌘K</kbd>
            </button>
          </motion.div>
          <motion.dl {...item(0.56)} className="mt-14 flex flex-wrap gap-x-12 gap-y-6">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dd className="text-3xl font-semibold tracking-tight text-arsenal-primary">
                  <CountUp value={stat.value} />
                </dd>
                <dt className="mt-1 text-sm text-arsenal-secondary">{stat.label}</dt>
              </div>
            ))}
          </motion.dl>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const reduced = useReducedMotion();
  return (
    <section aria-label="How it works" className="site-container py-24">
      <div className="site-label">How it works</div>
      <h2 className="site-title mt-3 max-w-2xl">From vault to production in four moves.</h2>
      <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
        <svg
          aria-hidden
          className="absolute left-0 top-[15px] hidden h-px w-full md:block"
          preserveAspectRatio="none"
          viewBox="0 0 100 1"
        >
          <line
            x1="0"
            y1="0.5"
            x2="100"
            y2="0.5"
            stroke="var(--arsenal-border)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <motion.line
            x1="0"
            y1="0.5"
            x2="100"
            y2="0.5"
            stroke="var(--arsenal-accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: reduced ? 1 : 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: '-120px' }}
            transition={{ duration: 1.8, ease: EASE }}
          />
        </svg>
        {STEPS.map((step, i) => (
          <motion.li
            key={step.title}
            className="relative"
            initial={reduced ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-120px' }}
            transition={{ duration: 0.6, delay: 0.25 + i * 0.35, ease: EASE }}
          >
            <span className="relative flex h-[31px] w-[31px] items-center justify-center rounded-full border border-arsenal-border bg-arsenal-background font-mono text-xs text-arsenal-accent">
              {i + 1}
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-arsenal-primary">
              {step.title}
            </h3>
            <p className="mt-2 max-w-[16rem] text-[14.5px] leading-relaxed text-arsenal-secondary">
              {step.body}
            </p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function Modules() {
  const featured = MODULE_SHORTCUTS.map((slug) => FEATURE_AREAS.find((f) => f.slug === slug))
    .filter((f): f is (typeof FEATURE_AREAS)[number] => Boolean(f))
    .slice(0, 6);
  return (
    <section aria-label="Modules" className="site-container py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="site-label">The armory</div>
          <h2 className="site-title mt-3 max-w-2xl">More than components.</h2>
          <p className="site-lede mt-4 max-w-xl">
            Modules for the whole repository: bootstrap, testing, CI, AI rules, context and docs.
          </p>
        </div>
        <Link
          href="/modules"
          className="text-sm font-medium text-arsenal-accent transition-opacity hover:opacity-80"
        >
          All {FEATURE_AREAS.length} modules →
        </Link>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((feature, i) => (
          <motion.div
            key={feature.slug}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: EASE }}
          >
            <Link
              href={`/modules/${feature.slug}`}
              className="site-card group flex h-full flex-col p-6"
            >
              <span className="truncate font-mono text-xs text-arsenal-secondary">
                {feature.packages[0]}
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-arsenal-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-arsenal-secondary">
                {feature.tagline}
              </p>
              <span className="mt-auto pt-6 text-sm font-medium text-arsenal-accent">
                Open
                <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section aria-label="Quick start" className="site-container py-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div>
          <div className="site-label">Quick start</div>
          <h2 className="site-title mt-3">Arm a project in a minute.</h2>
          <p className="site-lede mt-4">
            Add the UI package, import the styles and the Tailwind preset. Every component then
            follows your theme.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/components"
              className="inline-flex h-11 items-center rounded-full bg-arsenal-accent px-6 text-sm font-semibold text-arsenal-background transition-opacity hover:opacity-90"
            >
              Pick a component
            </Link>
            <Link
              href="/labs"
              className="inline-flex h-11 items-center rounded-full border border-arsenal-border px-5 text-sm font-medium text-arsenal-primary transition-colors hover:border-arsenal-border-hover"
            >
              See the labs
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
