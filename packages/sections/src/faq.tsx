"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Reveal } from "@arsenal/motion";
import { SectionHeader } from "@arsenal/ui";

const FAQS = [
  { q: "What is Arsenal?", a: "A config-driven website builder for Oblivion Labs products." },
  { q: "Do I need to write UI code?", a: "No — define site.config.ts and Arsenal assembles sections, theme, and modules." },
  { q: "Can I customize sections?", a: "Yes — pick variants or extend the section registry with your own components." },
  { q: "Is the cursor required?", a: "No — it auto-disables on touch devices and respects prefers-reduced-motion." },
];

export function FAQ() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <SectionHeader eyebrow="FAQ" title="Common questions" align="left" />
        </Reveal>
        <Accordion.Root type="single" collapsible className="space-y-2">
          {FAQS.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 0.05}>
              <Accordion.Item value={faq.q} className="rounded-arsenal border border-arsenal-border bg-arsenal-surface px-4">
                <Accordion.Header>
                  <Accordion.Trigger className="flex w-full items-center justify-between py-4 text-left font-medium">
                    {faq.q}
                    <span className="text-arsenal-accent">+</span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="pb-4 text-sm text-arsenal-secondary">{faq.a}</Accordion.Content>
              </Accordion.Item>
            </Reveal>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
