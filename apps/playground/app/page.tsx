"use client";

import Link from "next/link";
import { GlassCard, GridBackground, OrbBackground } from "@arsenal/ui";
import { ArsenalAppShell } from "@/components/arsenal-app-shell";
import { ALL_PACKAGES, FEATURE_AREAS } from "@/lib/feature-catalog";

export default function HomePage() {
  return (
    <ArsenalAppShell
      title="Arsenal"
      subtitle="Modular AI context library for preprocessing, knowledge graphs, and prompt optimization"
    >
      <div className="relative mx-auto max-w-5xl space-y-10">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-arsenal-lg">
          <OrbBackground />
          <GridBackground />
        </div>

        <section className="relative overflow-hidden rounded-arsenal border border-arsenal-border/80 bg-arsenal-surface/60 p-8 backdrop-blur-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-arsenal-accent">
            TypeScript monorepo · pnpm workspaces
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            AI context engine for any repository
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-arsenal-secondary">
            Arsenal sits between your codebase and any LLM. It preprocesses repo knowledge,
            compiles task-specific context, and cuts token usage — without sending raw source to models.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-arsenal-muted">
            <span>Claude</span><span>·</span>
            <span>Cursor</span><span>·</span>
            <span>Codex</span><span>·</span>
            <span>Gemini</span><span>·</span>
            <span>OpenAI</span>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium uppercase tracking-wider text-arsenal-muted">
            Feature areas
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FEATURE_AREAS.map((feature) => (
              <Link key={feature.id} href={`/features/${feature.slug}`}>
                <GlassCard className="h-full transition hover:border-arsenal-accent/40">
                  <p className="text-xs font-medium text-arsenal-accent">{feature.capabilities.length} capabilities</p>
                  <h4 className="mt-2 text-xl font-semibold">{feature.title}</h4>
                  <p className="mt-2 text-sm text-arsenal-secondary">{feature.tagline}</p>
                  <p className="mt-3 text-xs text-arsenal-muted">{feature.packages.join(", ")}</p>
                </GlassCard>
              </Link>
            ))}
            <Link href="/components">
              <GlassCard className="h-full border-arsenal-accent/20 bg-arsenal-accent/5 transition hover:border-arsenal-accent/50">
                <p className="text-xs font-medium text-arsenal-accent">23 components</p>
                <h4 className="mt-2 text-xl font-semibold">UI Library</h4>
                <p className="mt-2 text-sm text-arsenal-secondary">
                  Live previews and copy-paste snippets for every @arsenal/ui component.
                </p>
              </GlassCard>
            </Link>
            <Link href="/context">
              <GlassCard className="h-full border-arsenal-accent/20 bg-arsenal-accent/5 transition hover:border-arsenal-accent/50">
                <p className="text-xs font-medium text-arsenal-accent">Live demo</p>
                <h4 className="mt-2 text-xl font-semibold">Context Intelligence</h4>
                <p className="mt-2 text-sm text-arsenal-secondary">
                  Token savings dashboard with real analytics from this repo&apos;s `.arsenal/` data.
                </p>
              </GlassCard>
            </Link>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium uppercase tracking-wider text-arsenal-muted">
            Pipeline
          </h3>
          <GlassCard className="mt-4 font-mono text-sm text-arsenal-secondary">
            <pre className="overflow-x-auto whitespace-pre leading-relaxed">{`Repository
  ↓ Preprocessing      (@arsenal/context-engine, @arsenal/cache, @arsenal/summary)
  ↓ Knowledge Graph    (@arsenal/knowledge, @arsenal/retrieval)
  ↓ Context Compiler   (@arsenal/context)
  ↓ Budget Optimizer   (@arsenal/budget)
  ↓ Prompt Compiler    (@arsenal/prompt, @arsenal/policy)
  ↓ LLM`}</pre>
          </GlassCard>
        </section>

        <section>
          <h3 className="text-sm font-medium uppercase tracking-wider text-arsenal-muted">
            Packages ({ALL_PACKAGES.length})
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {ALL_PACKAGES.map((pkg) => (
              <code
                key={pkg}
                className="rounded-full border border-arsenal-border bg-arsenal-elevated/50 px-3 py-1 text-xs text-arsenal-secondary"
              >
                {pkg}
              </code>
            ))}
          </div>
        </section>
      </div>
    </ArsenalAppShell>
  );
}
