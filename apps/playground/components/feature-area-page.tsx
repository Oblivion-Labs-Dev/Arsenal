"use client";

import Link from "next/link";
import { GlassCard } from "@arsenal/ui";
import type { FeatureArea } from "@/lib/feature-catalog";
import { BUDGET_PROFILES, GRAPH_QUERIES } from "@/lib/feature-catalog";

export function FeatureAreaPage({ feature }: { feature: FeatureArea }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-sm font-medium text-arsenal-accent">{feature.packages.join(" · ")}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{feature.title}</h2>
        <p className="mt-1 text-lg text-arsenal-secondary">{feature.tagline}</p>
        <p className="mt-4 max-w-3xl text-arsenal-muted">{feature.description}</p>
      </header>

      {feature.relatedLinks?.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex items-center gap-2 rounded-arsenal border border-arsenal-accent/30 bg-arsenal-accent/10 px-4 py-2 text-sm font-medium text-arsenal-accent hover:bg-arsenal-accent/20"
        >
          {link.label} →
        </Link>
      ))}

      {feature.id === "knowledge-graph" && (
        <div id="queries">
          <GlassCard>
          <h3 className="text-sm font-medium uppercase tracking-wider text-arsenal-muted">
            Graph queries answer
          </h3>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {GRAPH_QUERIES.map((q) => (
              <li key={q} className="text-sm text-arsenal-secondary">• {q}</li>
            ))}
          </ul>
          </GlassCard>
        </div>
      )}

      {feature.id === "token-usage" && (
        <GlassCard>
          <h3 className="text-sm font-medium uppercase tracking-wider text-arsenal-muted">
            Budget profiles
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-arsenal-border text-arsenal-muted">
                  <th className="pb-2 pr-4 font-medium">Profile</th>
                  <th className="pb-2 pr-4 font-medium">Max tokens</th>
                  <th className="pb-2 font-medium">Use case</th>
                </tr>
              </thead>
              <tbody>
                {BUDGET_PROFILES.map((p) => (
                  <tr key={p.name} className="border-b border-arsenal-border/50 text-arsenal-secondary">
                    <td className="py-2 pr-4 font-mono text-arsenal-accent">{p.name}</td>
                    <td className="py-2 pr-4">{p.tokens}</td>
                    <td className="py-2">{p.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <section>
        <h3 className="text-sm font-medium uppercase tracking-wider text-arsenal-muted">
          Available in this library ({feature.capabilities.length})
        </h3>
        <div className="mt-4 space-y-3">
          {feature.capabilities.map((cap) => (
            <GlassCard key={cap.name} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="font-medium text-arsenal-primary">{cap.name}</h4>
                <code className="rounded bg-arsenal-elevated px-2 py-0.5 text-xs text-arsenal-accent">
                  {cap.package}
                </code>
              </div>
              <p className="mt-2 text-sm text-arsenal-secondary">{cap.description}</p>
              {cap.outputs && (
                <p className="mt-2 text-xs text-arsenal-muted">
                  Outputs: <code className="text-arsenal-secondary">{cap.outputs}</code>
                </p>
              )}
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
