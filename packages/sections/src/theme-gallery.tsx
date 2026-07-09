"use client";

import { Reveal } from "@arsenal/motion";
import { GlassCard, SectionHeader } from "@arsenal/ui";
import { THEMES } from "@arsenal/themes";

export function ThemeGallery() {
  return (
    <section id="themes" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeader eyebrow="Themes" title="Three palettes. Infinite polish." />
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.values(THEMES).map((theme, i) => (
            <Reveal key={theme.id} delay={i * 0.1}>
              <GlassCard
                className="cursor-pointer"
                onClick={() => document.documentElement.setAttribute("data-theme", theme.id)}
              >
                <div className="mb-4 flex gap-2">
                  {Object.values(theme.colors)
                    .slice(0, 5)
                    .map((c) => (
                      <div key={c} className="h-8 w-8 rounded-full border border-white/10" style={{ background: c }} />
                    ))}
                </div>
                <h3 className="font-semibold">{theme.label}</h3>
                <p className="mt-1 text-sm capitalize text-arsenal-secondary">{theme.mode} mode</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
