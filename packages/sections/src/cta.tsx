"use client";

import { Reveal } from "@arsenal/motion";
import { OrbBackground, PrimaryButton, SectionHeader } from "@arsenal/ui";

export function CTASection() {
  return (
    <section className="relative overflow-hidden px-6 py-32">
      <OrbBackground />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <Reveal>
          <SectionHeader
            title="Stop rebuilding websites. Define intent once."
            subtitle="Arsenal forges the interface, motion, and production shell."
          />
          <PrimaryButton forge>Generate Site</PrimaryButton>
        </Reveal>
      </div>
    </section>
  );
}
