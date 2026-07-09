"use client";

import { useState } from "react";
import { Reveal } from "@arsenal/motion";
import { GlassCard, GradientBorder, SectionHeader } from "@arsenal/ui";

const CONFIG_CODE = `export default defineSite({
  type: "chrome-extension",
  name: "ApplyPilot",
  tagline: "Autofill job applications with memory.",
  theme: "obsidian-cyber",
  personality: "premium-professional",
  pages: ["landing", "dashboard", "docs"],
  modules: ["waitlist", "blog", "analytics"],
  features: [
    "autofill",
    "resume-attach",
    "cover-letter",
    "job-tracker",
  ],
});`;

export function ConfigPreview() {
  const [theme, setTheme] = useState("obsidian-cyber");

  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeader
            eyebrow="Live preview"
            title="Config in. Site out."
            subtitle="Edit the config — watch the preview update."
          />
        </Reveal>
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal direction="left">
            <GradientBorder>
              <pre className="overflow-x-auto p-6 text-sm leading-relaxed text-arsenal-secondary">
                <code>{CONFIG_CODE}</code>
              </pre>
            </GradientBorder>
          </Reveal>
          <Reveal direction="right">
            <GlassCard glow className="flex min-h-[320px] flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-arsenal-muted">Preview</p>
                <h3 className="mt-2 text-2xl font-semibold">ApplyPilot</h3>
                <p className="mt-2 text-arsenal-secondary">Autofill job applications with memory.</p>
              </div>
              <div className="mt-6 flex gap-2">
                {(["obsidian-cyber", "ivory-graphite", "deep-forge"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTheme(t);
                      document.documentElement.setAttribute("data-theme", t);
                    }}
                    className={`rounded-full px-3 py-1 text-xs ${theme === t ? "bg-arsenal-accent text-arsenal-background" : "border border-arsenal-border"}`}
                    data-cursor="button"
                  >
                    {t.split("-")[0]}
                  </button>
                ))}
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
