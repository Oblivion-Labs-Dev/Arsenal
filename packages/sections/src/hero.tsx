"use client";

import { Reveal } from "@arsenal/motion";
import {
  OrbBackground,
  GridBackground,
  PrimaryButton,
  SecondaryButton,
} from "@arsenal/ui";

interface HeroProps {
  title?: string;
  subtitle?: string;
  cta1?: string;
  cta2?: string;
  variant?: string;
}

export function Hero({
  title = "Forge websites from intent.",
  subtitle = "Define what your product does. Arsenal builds the interface, motion, layout, theme, and production shell.",
  cta1 = "Generate Site",
  cta2 = "View Templates",
}: HeroProps) {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6 pt-24">
      <OrbBackground />
      <GridBackground />
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-arsenal-accent">
            Oblivion Labs · Arsenal
          </p>
          <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">{title}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-arsenal-secondary">{subtitle}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <PrimaryButton forge>{cta1}</PrimaryButton>
            <SecondaryButton>{cta2}</SecondaryButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
