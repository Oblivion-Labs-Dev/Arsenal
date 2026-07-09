"use client";

import {
  BentoCard,
  CommandPalette,
  COMPONENT_CATEGORIES,
  DashboardCard,
  FeatureCard,
  FloatingNav,
  GlassCard,
  GradientBorder,
  GridBackground,
  OrbBackground,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  ThemeToggle,
  TimelineCard,
  UI_COMPONENT_CATALOG,
  UI_SETUP_SNIPPET,
  type ComponentCatalogEntry,
} from "@arsenal/ui";
import { CopyCodeBlock } from "./copy-code-block";
import { useMemo, useState } from "react";

function ComponentPreview({ entry }: { entry: ComponentCatalogEntry }) {
  switch (entry.id) {
    case "glass-card":
      return (
        <GlassCard glow className="max-w-sm">
          <h3 className="font-semibold">Glass surface</h3>
          <p className="mt-2 text-sm text-arsenal-secondary">Backdrop blur with hover lift.</p>
        </GlassCard>
      );
    case "bento-card":
      return (
        <div className="grid w-full max-w-xl gap-4 md:grid-cols-2">
          <BentoCard title="Retrieval" description="Hybrid TF-IDF ranking." icon={<span>⚡</span>} />
          <BentoCard span="2" title="Budget engine" description="Cap context before the model." />
        </div>
      );
    case "feature-card":
      return (
        <FeatureCard badge="New" title="Knowledge graph" description="Link files and summaries for smarter context." />
      );
    case "dashboard-card":
      return (
        <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-3">
          <DashboardCard title="Tokens saved" value="42%" change="+12%" trend="up" />
          <DashboardCard title="Context" value="8.2k" change="-1.1k" trend="down" />
          <DashboardCard title="Cache" value="94%" trend="neutral" />
        </div>
      );
    case "timeline-card":
      return (
        <TimelineCard
          year="2026"
          title="Context compiler"
          description="Assembles prompts within token budget."
          active
        />
      );
    case "section-header":
      return (
        <SectionHeader
          align="left"
          eyebrow="Preview"
          title="Section header"
          subtitle="Eyebrow, title, subtitle, and action slot."
          action={<PrimaryButton>Action</PrimaryButton>}
          className="mb-0"
        />
      );
    case "primary-button":
      return <PrimaryButton forge>Primary action</PrimaryButton>;
    case "secondary-button":
      return <SecondaryButton>Secondary action</SecondaryButton>;
    case "theme-toggle":
      return <ThemeToggle />;
    case "floating-nav":
      return (
        <div className="relative h-16 w-full overflow-hidden rounded-arsenal border border-arsenal-border bg-arsenal-background">
          <FloatingNav className="!left-4 !top-3 !translate-x-0 scale-90" />
        </div>
      );
    case "command-palette":
      return (
        <p className="text-sm text-arsenal-secondary">
          Mount <code className="text-arsenal-accent">&lt;CommandPalette /&gt;</code> in your layout — press{" "}
          <kbd className="rounded border border-arsenal-border px-1.5 py-0.5 text-xs">⌘K</kbd> to open.
        </p>
      );
    case "orb-background":
      return (
        <section className="relative h-48 w-full max-w-xl overflow-hidden rounded-arsenal border border-arsenal-border">
          <OrbBackground />
          <div className="relative z-10 flex h-full items-center p-6">
            <p className="font-medium">Hero with orb glow</p>
          </div>
        </section>
      );
    case "grid-background":
      return (
        <section className="relative h-40 w-full max-w-xl overflow-hidden rounded-arsenal border border-arsenal-border">
          <GridBackground />
          <div className="relative z-10 flex h-full items-center p-6 text-sm text-arsenal-secondary">
            Grid overlay
          </div>
        </section>
      );
    case "gradient-border":
      return (
        <GradientBorder className="max-w-xs">
          <div className="p-5 text-sm text-arsenal-secondary">Gradient-framed panel</div>
        </GradientBorder>
      );
    case "cn":
      return (
        <div className="rounded-arsenal border border-arsenal-accent p-4 text-sm shadow-arsenal-glow">
          cn() merged active-state classes
        </div>
      );
    default:
      return null;
  }
}

export function UiComponentShowcase() {
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(
    () =>
      category === "all"
        ? UI_COMPONENT_CATALOG
        : UI_COMPONENT_CATALOG.filter((c) => c.category === category),
    [category],
  );

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-accent">Setup</p>
          <h2 className="mt-2 text-2xl font-semibold">Import in any React app</h2>
          <p className="mt-2 max-w-2xl text-arsenal-secondary">
            Install <code className="text-arsenal-accent">@arsenal/ui</code>, import{" "}
            <code className="text-arsenal-accent">@arsenal/ui/styles.css</code> for theme tokens, and extend Tailwind
            with the Arsenal preset.
          </p>
        </div>
        <CopyCodeBlock code={UI_SETUP_SNIPPET} label="Copy setup" />
      </section>

      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={
            category === "all"
              ? "rounded-full bg-arsenal-accent px-4 py-1.5 text-sm font-medium text-arsenal-background"
              : "rounded-full border border-arsenal-border px-4 py-1.5 text-sm text-arsenal-secondary hover:border-arsenal-accent"
          }
        >
          All
        </button>
        {COMPONENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={
              category === cat.id
                ? "rounded-full bg-arsenal-accent px-4 py-1.5 text-sm font-medium text-arsenal-background"
                : "rounded-full border border-arsenal-border px-4 py-1.5 text-sm text-arsenal-secondary hover:border-arsenal-accent"
            }
          >
            {cat.label}
          </button>
        ))}
      </section>

      <div className="space-y-10">
        {filtered.map((entry) => (
          <article
            key={entry.id}
            id={entry.id}
            className="scroll-mt-24 rounded-arsenal-lg border border-arsenal-border bg-arsenal-surface/40 p-6 backdrop-blur-sm"
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-arsenal-muted">{entry.category}</p>
                <h3 className="mt-1 text-xl font-semibold">{entry.name}</h3>
                <p className="mt-2 text-sm text-arsenal-secondary">{entry.description}</p>
                <p className="mt-3 font-mono text-xs text-arsenal-accent">{entry.importLine}</p>
              </div>
            </div>

            <div className="mb-6 rounded-arsenal border border-dashed border-arsenal-border bg-arsenal-background/60 p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-arsenal-muted">Preview</p>
              <ComponentPreview entry={entry} />
            </div>

            <CopyCodeBlock code={entry.code} />
          </article>
        ))}
      </div>

      <CommandPalette />
    </div>
  );
}
