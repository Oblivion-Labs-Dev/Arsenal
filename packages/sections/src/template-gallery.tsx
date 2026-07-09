"use client";

import { Reveal } from "@arsenal/motion";
import { BentoCard, SectionHeader } from "@arsenal/ui";

const TEMPLATES = [
  { title: "SaaS", description: "Landing, pricing, FAQ, waitlist — full funnel." },
  { title: "Chrome Extension", description: "Install flow, features, docs preview." },
  { title: "Portfolio", description: "Timeline, testimonials, contact." },
  { title: "Dashboard", description: "App shell with analytics modules." },
  { title: "Docs", description: "Sidebar nav, MDX content, search." },
];

export function TemplateGallery() {
  return (
    <section id="templates" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeader eyebrow="Templates" title="Start from proven layouts" />
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.08}>
              <BentoCard title={t.title} description={t.description} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
