"use client";

import { Reveal } from "@arsenal/motion";
import { GlassCard, SectionHeader } from "@arsenal/ui";

const STEPS = [
  { step: "01", title: "Intent", desc: "Describe your product in site.config.ts" },
  { step: "02", title: "Config", desc: "Zod validates theme, pages, modules" },
  { step: "03", title: "Theme", desc: "CSS variables and Tailwind tokens apply" },
  { step: "04", title: "Sections", desc: "Hero, features, pricing assemble" },
  { step: "05", title: "Modules", desc: "Blog, docs, waitlist plug in" },
  { step: "06", title: "Ship", desc: "Production-ready Next.js site" },
];

export function BuilderPipeline() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeader eyebrow="Pipeline" title="Intent → Production Site" />
        </Reveal>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.06}>
              <GlassCard className="relative text-center">
                <span className="text-xs font-bold text-arsenal-accent">{s.step}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-xs text-arsenal-secondary">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <span className="absolute -right-2 top-1/2 hidden text-arsenal-muted lg:block">→</span>
                )}
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
