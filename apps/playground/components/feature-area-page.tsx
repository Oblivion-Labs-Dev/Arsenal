'use client';

import Link from 'next/link';
import {
  DashboardCard,
  GlassCard,
  GradientBorder,
  NetworkBackground,
  PrimaryButton,
  SecondaryButton,
} from '@arsenal/ui';
import type { FeatureArea } from '@/lib/feature-catalog';
import { BUDGET_PROFILES, GRAPH_QUERIES } from '@/lib/feature-catalog';

export function FeatureAreaPage({ feature }: { feature: FeatureArea }) {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-arsenal-lg border border-arsenal-border/80 bg-arsenal-background/78 p-6 md:p-8">
        <NetworkBackground
          density="calm"
          accent={feature.id === 'knowledge-graph' ? 'cyan' : 'ember'}
        />
        <div className="relative z-10 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-arsenal-accent">
            {feature.packages.join(' / ')}
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            {feature.title}
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-arsenal-secondary">
            {feature.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {feature.relatedLinks?.map((link) => (
              <Link key={link.href} href={link.href}>
                <PrimaryButton forge>{link.label}</PrimaryButton>
              </Link>
            ))}
            <Link href="/components">
              <SecondaryButton>Browse reusable UI</SecondaryButton>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {feature.metrics.map((metric) => (
          <DashboardCard
            key={metric.label}
            title={metric.label}
            value={metric.value}
            change={metric.hint}
            trend="neutral"
          />
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <GradientBorder>
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-arsenal-accent">
              Workpiece flow
            </p>
            <ol className="mt-5 space-y-3">
              {feature.playbook.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-arsenal-sm border border-arsenal-border bg-arsenal-background/70 p-3"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-arsenal-sm bg-arsenal-accent/14 font-mono text-xs text-arsenal-accent">
                    {index + 1}
                  </span>
                  <span className="text-sm text-arsenal-secondary">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </GradientBorder>

        <GlassCard className="arsenal-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-arsenal-muted">
            Package boundary
          </p>
          <h3 className="mt-2 text-2xl font-semibold">Import exactly what the repo needs.</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {feature.packages.map((pkg) => (
              <code
                key={pkg}
                className="rounded-full border border-arsenal-border bg-arsenal-background/70 px-3 py-1 text-xs text-arsenal-secondary"
              >
                {pkg}
              </code>
            ))}
          </div>
        </GlassCard>
      </section>

      {feature.id === 'knowledge-graph' ? (
        <div id="queries">
          <GlassCard className="arsenal-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-arsenal-accent">
              Graph queries
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {GRAPH_QUERIES.map((query) => (
                <div
                  key={query}
                  className="rounded-arsenal-sm border border-arsenal-border bg-arsenal-background/58 p-3 text-sm text-arsenal-secondary"
                >
                  {query}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      ) : null}

      {feature.id === 'token-optimization' ? (
        <GlassCard className="arsenal-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-arsenal-accent">
            Budget profiles
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-arsenal-border text-arsenal-muted">
                  <th className="pb-2 pr-4 font-medium">Profile</th>
                  <th className="pb-2 pr-4 font-medium">Max tokens</th>
                  <th className="pb-2 font-medium">Use case</th>
                </tr>
              </thead>
              <tbody>
                {BUDGET_PROFILES.map((profile) => (
                  <tr
                    key={profile.name}
                    className="border-b border-arsenal-border/50 text-arsenal-secondary"
                  >
                    <td className="py-2 pr-4 font-mono text-arsenal-accent">{profile.name}</td>
                    <td className="py-2 pr-4">{profile.tokens}</td>
                    <td className="py-2">{profile.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : null}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-arsenal-muted">
              Capability inventory
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              {feature.capabilities.length} reusable building blocks
            </h3>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {feature.capabilities.map((capability) => (
            <GlassCard key={capability.name} className="h-full">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h4 className="font-medium text-arsenal-primary">{capability.name}</h4>
                <code className="rounded-full bg-arsenal-elevated px-2 py-1 text-[0.68rem] text-arsenal-accent">
                  {capability.package}
                </code>
              </div>
              <p className="mt-3 text-sm leading-6 text-arsenal-secondary">
                {capability.description}
              </p>
              {capability.outputs ? (
                <p className="mt-3 text-xs text-arsenal-muted">
                  Outputs: <code className="text-arsenal-secondary">{capability.outputs}</code>
                </p>
              ) : null}
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
