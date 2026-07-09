"use client";

import { Reveal } from "@arsenal/motion";
import { BentoCard, SectionHeader } from "@arsenal/ui";

const MODULES = [
  { title: "Blog", description: "MDX posts, tags, RSS, SEO metadata." },
  { title: "Docs", description: "Sidebar navigation, search, versioned content." },
  { title: "Waitlist", description: "Email capture with analytics events." },
  { title: "Analytics", description: "Event hooks for Plausible, PostHog, custom." },
  { title: "Dashboard", description: "Authenticated app shell with modules." },
  { title: "Admin", description: "Internal tools, changelog, user management." },
];

export function ModuleMarketplace() {
  return (
    <section id="modules" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeader eyebrow="Modules" title="Plug-and-play capabilities" />
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <Reveal key={m.title} delay={i * 0.06}>
              <BentoCard title={m.title} description={m.description} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
