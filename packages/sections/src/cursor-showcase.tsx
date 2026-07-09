"use client";

import { Reveal } from "@arsenal/motion";
import { GlassCard, PrimaryButton, SecondaryButton, SectionHeader } from "@arsenal/ui";

export function CursorShowcase() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <SectionHeader
            eyebrow="Interactive cursor"
            title="Hover to feel the forge"
            subtitle="Element-aware states: button, card, link, input, forge CTA."
          />
        </Reveal>
        <Reveal delay={0.1}>
          <GlassCard className="flex flex-wrap items-center justify-center gap-4 p-8">
            <SecondaryButton>Button</SecondaryButton>
            <GlassCard className="px-6 py-3">Card</GlassCard>
            <a href="#" className="text-arsenal-accent underline" data-cursor="link">
              Link
            </a>
            <input
              placeholder="Input"
              className="rounded-arsenal-sm border border-arsenal-border bg-arsenal-elevated px-4 py-2 text-sm outline-none focus:border-arsenal-accent"
              data-cursor="input"
            />
            <button type="button" className="text-arsenal-muted" data-cursor="disabled" disabled>
              Disabled
            </button>
            <PrimaryButton forge>Forge CTA</PrimaryButton>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}
