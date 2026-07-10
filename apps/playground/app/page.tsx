'use client';

import Link from 'next/link';
import {
  DashboardCard,
  GlassCard,
  GradientBorder,
  GridBackground,
  NetworkBackground,
  PrimaryButton,
  SecondaryButton,
  ScrollReveal,
} from '@arsenal/ui';
import { ArsenalAppShell } from '@/components/arsenal-app-shell';
import { ALL_PACKAGES, FEATURE_AREAS, MODULE_SHORTCUTS } from '@/lib/feature-catalog';

const heroStats = [
  {
    title: 'Reusable modules',
    value: '19',
    change: 'UI, context, testing, dashboards',
    trend: 'up' as const,
  },
  {
    title: 'Token savings',
    value: '85-98%',
    change: 'summary-first retrieval',
    trend: 'up' as const,
  },
  {
    title: 'Import surface',
    value: '1 component',
    change: 'or entire module',
    trend: 'neutral' as const,
  },
];

const vaultLanes = [
  'Bootstrap',
  'AI Rules',
  'Components',
  'Testing',
  'Knowledge',
  'Docs',
  'Dashboards',
  'Labs',
];

export default function HomePage() {
  const featured = FEATURE_AREAS.filter((feature) => MODULE_SHORTCUTS.includes(feature.slug));

  return (
    <ArsenalAppShell
      title="Arsenal Vault"
      subtitle="Everything needed to bootstrap and maintain a world-class repository."
    >
      <div className="space-y-16">
        {/* Hero Section */}
        <section className="relative min-h-[75vh] overflow-hidden rounded-arsenal-lg border border-arsenal-border/70 bg-gradient-to-b from-arsenal-surface/90 to-arsenal-elevated/70 backdrop-blur-md">
          <NetworkBackground density="dense" accent="ember" />
          <GridBackground className="opacity-30" />
          
          {/* Decorative glowing orbs */}
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-arsenal-accent/10 blur-[100px] pointer-events-none" />
          <div className="absolute right-10 bottom-10 h-96 w-96 rounded-full bg-orange-600/5 blur-[120px] pointer-events-none" />
          
          <div className="absolute inset-x-8 top-8 h-px arsenal-rail opacity-80" />
          
          <div className="relative z-10 grid min-h-[75vh] gap-12 p-8 md:p-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="max-w-4xl space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-arsenal-accent/20 bg-arsenal-accent/10 px-3.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.24em] text-arsenal-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-arsenal-accent animate-pulse" />
                Shared library system
              </span>
              <h2 className="text-5xl font-extrabold leading-[0.92] tracking-tight md:text-7xl xl:text-8xl bg-gradient-to-br from-white via-arsenal-text-secondary to-arsenal-muted bg-clip-text text-transparent">
                A weapons vault for developer productivity.
              </h2>
              <p className="max-w-2xl text-base leading-8 text-arsenal-muted md:text-lg">
                Arsenal is not an application. It is the reusable toolkit every future repository
                imports: UI systems, AI rules, context engineering, testing gates, docs, dashboards,
                templates, and automation.
              </p>
              <div className="pt-4 flex flex-wrap gap-4">
                <Link href="/components">
                  <PrimaryButton forge>Open component vault</PrimaryButton>
                </Link>
                <Link href="/features/repository-bootstrap">
                  <SecondaryButton>Inspect bootstrap</SecondaryButton>
                </Link>
                <Link href="/coming-soon">
                  <SecondaryButton>View roadmap</SecondaryButton>
                </Link>
              </div>
            </div>

            <GradientBorder className="self-stretch lg:h-full">
              <div className="relative h-full overflow-hidden rounded-arsenal-lg bg-arsenal-background/95 p-6 border border-arsenal-border/50">
                <div className="absolute inset-0 arsenal-vault-grid opacity-25" />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-arsenal-muted">
                      Repository Launch Sequence
                    </p>
                    <div className="mt-6 space-y-2.5">
                      {vaultLanes.map((lane, index) => (
                        <div
                          key={lane}
                          className="flex items-center gap-3 rounded-arsenal-sm border border-arsenal-border/50 bg-arsenal-surface/40 hover:bg-arsenal-elevated/70 hover:border-arsenal-border-hover px-4 py-2.5 transition-all duration-200"
                        >
                          <span className="grid h-6 w-6 place-items-center rounded-arsenal-sm bg-arsenal-accent/15 font-mono text-[0.68rem] font-bold text-arsenal-accent">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-arsenal-text-secondary">{lane}</span>
                          <span className="ml-auto h-1 w-12 rounded-full bg-gradient-to-r from-arsenal-accent to-transparent" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GradientBorder>
          </div>
        </section>

        {/* Hero Stats */}
        <section className="grid gap-6 md:grid-cols-3">
          {heroStats.map((stat) => (
            <DashboardCard key={stat.title} {...stat} />
          ))}
        </section>

        {/* Operating Surface section */}
        <ScrollReveal>
          <section className="grid gap-8 lg:grid-cols-4 items-start">
            <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-4">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.3em] text-arsenal-accent">
                Operating surface
              </p>
              <h3 className="text-3xl font-extrabold tracking-tight">
                One platform, many imports.
              </h3>
              <p className="text-sm leading-7 text-arsenal-muted">
                Every module can stand alone. Import a button, a dashboard card, a context compiler,
                a test gate, or the complete repository bootstrap workflow.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:col-span-3">
              {featured.map((feature) => (
                <Link key={feature.id} href={`/features/${feature.slug}`}>
                  <GlassCard glow className="h-full flex flex-col justify-between p-6">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-arsenal-accent">
                            {feature.packages[0]}
                          </p>
                          <h4 className="mt-2 text-lg font-bold tracking-tight">{feature.title}</h4>
                        </div>
                        <span className="rounded-full border border-arsenal-border/80 px-2.5 py-0.5 text-[0.68rem] font-bold text-arsenal-muted bg-arsenal-elevated/45">
                          {feature.capabilities.length}
                        </span>
                      </div>
                      <p className="mt-4 text-xs leading-6 text-arsenal-muted">
                        {feature.tagline}
                      </p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-1.5">
                      {feature.packages.slice(0, 3).map((pkg) => (
                        <code
                          key={pkg}
                          className="rounded-full bg-arsenal-elevated/80 border border-arsenal-border px-2.5 py-1 text-[0.62rem] font-bold text-arsenal-muted uppercase tracking-wider"
                        >
                          {pkg.replace('@arsenal/', '')}
                        </code>
                      ))}
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* Pipeline & Matrix panels */}
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard className="p-8 space-y-6">
            <div>
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.3em] text-arsenal-accent">
                Pipeline
              </p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight">From raw repo to model-ready context.</h3>
            </div>
            <pre className="overflow-x-auto rounded-arsenal border border-arsenal-border bg-black/40 p-5 font-mono text-[0.72rem] leading-8 text-arsenal-muted shadow-inner">{`Repository
  -> Bootstrap blueprint
  -> Rules + quality gates
  -> Knowledge graph
  -> Token budget
  -> Prompt compiler
  -> Agent-ready artifact`}</pre>
          </GlassCard>

          <GlassCard className="p-8 space-y-6">
            <div>
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.3em] text-arsenal-accent">
                Package matrix
              </p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight">Ecosystem Dependencies</h3>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {ALL_PACKAGES.map((pkg) => (
                <code
                  key={pkg}
                  className="rounded-full border border-arsenal-border bg-arsenal-background/70 px-3 py-1.5 text-[0.68rem] font-bold text-arsenal-muted hover:border-arsenal-accent/50 hover:text-arsenal-primary transition-colors cursor-default"
                >
                  {pkg}
                </code>
              ))}
            </div>
          </GlassCard>
        </section>
      </div>
    </ArsenalAppShell>
  );
}
