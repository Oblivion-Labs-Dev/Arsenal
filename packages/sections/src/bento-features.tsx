"use client";

import { Reveal } from "@arsenal/motion";
import { BentoCard, SectionHeader } from "@arsenal/ui";

const FEATURES = [
  { title: "Config-first", description: "One site.config.ts defines theme, pages, modules, and sections.", span: "2" as const },
  { title: "Theme engine", description: "Obsidian Cyber, Ivory Graphite, Deep Forge — CSS variables + Tailwind tokens." },
  { title: "Motion system", description: "Reveal, parallax, magnetic CTAs, premium interactive cursor." },
  { title: "Section registry", description: "Composable hero, bento, pricing, FAQ, and more." },
  { title: "Production shell", description: "SEO, sitemap, analytics hooks, accessibility baked in.", span: "2" as const },
];

export function BentoFeatures() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeader
            eyebrow="Capabilities"
            title="Everything a premium site needs"
            subtitle="Reusable sections, layouts, and modules — assembled from intent."
          />
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <BentoCard {...f} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
