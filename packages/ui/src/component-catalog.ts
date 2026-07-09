export type ComponentCategory =
  | "cards"
  | "buttons"
  | "typography"
  | "navigation"
  | "backgrounds"
  | "utilities";

export interface ComponentCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  importLine: string;
  code: string;
}

export const UI_SETUP_SNIPPET = `// 1. Install dependencies
pnpm add @arsenal/ui @arsenal/themes framer-motion

// 2. globals.css — theme tokens + CSS variables
@import "@arsenal/ui/styles.css";

@tailwind base;
@tailwind components;
@tailwind utilities;

// 3. tailwind.config.ts
import type { Config } from "tailwindcss";
import arsenalPreset from "@arsenal/ui/tailwind";

export default {
  presets: [arsenalPreset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./node_modules/@arsenal/ui/dist/**/*.js",
  ],
} satisfies Config;

// 4. Import components in your app
import { GlassCard, PrimaryButton } from "@arsenal/ui";`;

export const UI_COMPONENT_CATALOG: ComponentCatalogEntry[] = [
  {
    id: "glass-card",
    name: "GlassCard",
    description: "Frosted glass surface with optional glow hover and spring motion.",
    category: "cards",
    importLine: 'import { GlassCard } from "@arsenal/ui";',
    code: `import { GlassCard } from "@arsenal/ui";

export function Example() {
  return (
    <GlassCard glow className="max-w-sm">
      <h3 className="font-semibold">Glass surface</h3>
      <p className="mt-2 text-sm text-arsenal-secondary">
        Backdrop blur, border, and hover lift.
      </p>
    </GlassCard>
  );
}`,
  },
  {
    id: "bento-card",
    name: "BentoCard",
    description: "Grid tile with icon slot and optional two-column span.",
    category: "cards",
    importLine: 'import { BentoCard } from "@arsenal/ui";',
    code: `import { BentoCard } from "@arsenal/ui";

export function Example() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <BentoCard
        title="Hybrid retrieval"
        description="TF-IDF ranking with graph-aware boosts."
        icon={<span>⚡</span>}
      />
      <BentoCard
        span="2"
        title="Token budget engine"
        description="Profiles that cap context before it hits the model."
      />
    </div>
  );
}`,
  },
  {
    id: "feature-card",
    name: "FeatureCard",
    description: "Compact feature block with optional badge and children slot.",
    category: "cards",
    importLine: 'import { FeatureCard } from "@arsenal/ui";',
    code: `import { FeatureCard } from "@arsenal/ui";

export function Example() {
  return (
    <FeatureCard
      badge="New"
      title="Knowledge graph"
      description="Link files, symbols, and summaries for smarter retrieval."
    />
  );
}`,
  },
  {
    id: "dashboard-card",
    name: "DashboardCard",
    description: "Metric tile with value, change line, and trend coloring.",
    category: "cards",
    importLine: 'import { DashboardCard } from "@arsenal/ui";',
    code: `import { DashboardCard } from "@arsenal/ui";

export function Example() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <DashboardCard title="Tokens saved" value="42%" change="+12% vs last week" trend="up" />
      <DashboardCard title="Context size" value="8.2k" change="-1.1k" trend="down" />
      <DashboardCard title="Cache hits" value="94%" trend="neutral" />
    </div>
  );
}`,
  },
  {
    id: "timeline-card",
    name: "TimelineCard",
    description: "Roadmap or changelog entry with optional active highlight.",
    category: "cards",
    importLine: 'import { TimelineCard } from "@arsenal/ui";',
    code: `import { TimelineCard } from "@arsenal/ui";

export function Example() {
  return (
    <TimelineCard
      year="2026"
      title="Context compiler"
      description="Pipeline that assembles prompts within budget."
      active
    />
  );
}`,
  },
  {
    id: "section-header",
    name: "SectionHeader",
    description: "Page section title with eyebrow, subtitle, and optional action.",
    category: "typography",
    importLine: 'import { SectionHeader } from "@arsenal/ui";',
    code: `import { SectionHeader, PrimaryButton } from "@arsenal/ui";

export function Example() {
  return (
    <SectionHeader
      eyebrow="Arsenal UI"
      title="Composable surfaces"
      subtitle="Import cards, buttons, and backgrounds into any React app."
      action={<PrimaryButton>Get started</PrimaryButton>}
    />
  );
}`,
  },
  {
    id: "primary-button",
    name: "PrimaryButton",
    description: "Accent-filled CTA with magnetic hover motion.",
    category: "buttons",
    importLine: 'import { PrimaryButton } from "@arsenal/ui";',
    code: `import { PrimaryButton } from "@arsenal/ui";

export function Example() {
  return (
    <PrimaryButton forge onClick={() => console.log("clicked")}>
      Launch dashboard
    </PrimaryButton>
  );
}`,
  },
  {
    id: "secondary-button",
    name: "SecondaryButton",
    description: "Outlined secondary action with magnetic hover.",
    category: "buttons",
    importLine: 'import { SecondaryButton } from "@arsenal/ui";',
    code: `import { SecondaryButton } from "@arsenal/ui";

export function Example() {
  return <SecondaryButton>View docs</SecondaryButton>;
}`,
  },
  {
    id: "theme-toggle",
    name: "ThemeToggle",
    description: "Cycles Deep Forge, Obsidian Cyber, and Ivory Graphite themes.",
    category: "utilities",
    importLine: 'import { ThemeToggle } from "@arsenal/ui";',
    code: `import { ThemeToggle } from "@arsenal/ui";

export function Example() {
  return <ThemeToggle className="fixed bottom-6 right-6" />;
}`,
  },
  {
    id: "floating-nav",
    name: "FloatingNav",
    description: "Fixed top pill navigation bar with blur backdrop.",
    category: "navigation",
    importLine: 'import { FloatingNav } from "@arsenal/ui";',
    code: `import { FloatingNav } from "@arsenal/ui";

export function Example() {
  return <FloatingNav />;
}`,
  },
  {
    id: "command-palette",
    name: "CommandPalette",
    description: "⌘K / Ctrl+K overlay for quick commands.",
    category: "navigation",
    importLine: 'import { CommandPalette } from "@arsenal/ui";',
    code: `import { CommandPalette } from "@arsenal/ui";

export function Example() {
  return (
    <>
      <p className="text-sm text-arsenal-secondary">Press ⌘K or Ctrl+K</p>
      <CommandPalette />
    </>
  );
}`,
  },
  {
    id: "orb-background",
    name: "OrbBackground",
    description: "Layered accent orbs for hero sections.",
    category: "backgrounds",
    importLine: 'import { OrbBackground } from "@arsenal/ui";',
    code: `import { OrbBackground } from "@arsenal/ui";

export function Example() {
  return (
    <section className="relative min-h-[240px] overflow-hidden rounded-arsenal border border-arsenal-border">
      <OrbBackground />
      <div className="relative z-10 p-8">
        <h2 className="text-2xl font-semibold">Hero content</h2>
      </div>
    </section>
  );
}`,
  },
  {
    id: "grid-background",
    name: "GridBackground",
    description: "Radial-masked grid overlay for depth.",
    category: "backgrounds",
    importLine: 'import { GridBackground } from "@arsenal/ui";',
    code: `import { GridBackground } from "@arsenal/ui";

export function Example() {
  return (
    <section className="relative min-h-[200px] overflow-hidden rounded-arsenal border border-arsenal-border">
      <GridBackground />
      <div className="relative z-10 p-8">Content on grid</div>
    </section>
  );
}`,
  },
  {
    id: "gradient-border",
    name: "GradientBorder",
    description: "Accent gradient frame around any children.",
    category: "backgrounds",
    importLine: 'import { GradientBorder } from "@arsenal/ui";',
    code: `import { GradientBorder } from "@arsenal/ui";

export function Example() {
  return (
    <GradientBorder className="max-w-sm">
      <div className="p-6">
        <p className="text-sm text-arsenal-secondary">Framed content</p>
      </div>
    </GradientBorder>
  );
}`,
  },
  {
    id: "stat-card",
    name: "StatCard",
    description: "Simple metric tile with label, value, and optional hint.",
    category: "cards",
    importLine: 'import { StatCard } from "@arsenal/ui";',
    code: `import { StatCard } from "@arsenal/ui";

export function Example() {
  return <StatCard label="Tokens saved" value="42%" hint="vs last week" />;
}`,
  },
  {
    id: "scroll-reveal",
    name: "ScrollReveal",
    description: "Intersection-observer entrance animation with direction and delay.",
    category: "utilities",
    importLine: 'import { ScrollReveal } from "@arsenal/ui";',
    code: `import { ScrollReveal } from "@arsenal/ui";

export function Example() {
  return (
    <ScrollReveal direction="up" delay={0.1}>
      <p>Fades in when scrolled into view.</p>
    </ScrollReveal>
  );
}`,
  },
  {
    id: "tooltip",
    name: "Tooltip",
    description: "Portal tooltip with hover/focus and reposition on scroll.",
    category: "utilities",
    importLine: 'import { Tooltip } from "@arsenal/ui";',
    code: `import { Tooltip } from "@arsenal/ui";

export function Example() {
  return <Tooltip content="Helpful context on hover." label="Info" />;
}`,
  },
  {
    id: "badge",
    name: "Badge",
    description: "Status and priority pill with variant coloring.",
    category: "utilities",
    importLine: 'import { Badge } from "@arsenal/ui";',
    code: `import { Badge } from "@arsenal/ui";

export function Example() {
  return (
    <div className="flex gap-2">
      <Badge variant="progress">in progress</Badge>
      <Badge variant="p0">P0</Badge>
    </div>
  );
}`,
  },
  {
    id: "page-header",
    name: "PageHeader",
    description: "Page title block with subtitle and actions slot.",
    category: "typography",
    importLine: 'import { PageHeader } from "@arsenal/ui";',
    code: `import { PageHeader, PrimaryButton } from "@arsenal/ui";

export function Example() {
  return (
    <PageHeader
      title="Dashboard"
      subtitle="Live metrics from your repo."
      actions={<PrimaryButton>Refresh</PrimaryButton>}
    />
  );
}`,
  },
  {
    id: "guide-step",
    name: "GuideStep",
    description: "Numbered playbook step with optional info tooltip.",
    category: "typography",
    importLine: 'import { GuideStep } from "@arsenal/ui";',
    code: `import { GuideStep } from "@arsenal/ui";

export function Example() {
  return (
    <GuideStep
      id="step-1"
      step={1}
      title="Optimize resume"
      summary="Tailor keywords to the job description."
      tooltip="ATS scanners look for exact skill matches."
    >
      <p>Checklist content goes here.</p>
    </GuideStep>
  );
}`,
  },
  {
    id: "primary-link",
    name: "PrimaryLink",
    description: "Anchor-styled CTA — use with Next.js Link via primaryLinkClassName.",
    category: "buttons",
    importLine: 'import { PrimaryLink, primaryLinkClassName } from "@arsenal/ui";',
    code: `import Link from "next/link";
import { primaryLinkClassName } from "@arsenal/ui";

// With Next.js Link
<Link href="/dashboard" className={primaryLinkClassName}>Open</Link>

// Or plain anchor
import { PrimaryLink } from "@arsenal/ui";
<PrimaryLink href="/dashboard">Open</PrimaryLink>`,
  },
  {
    id: "light-dark-theme-toggle",
    name: "LightDarkThemeToggle",
    description: "Sun/moon toggle — wire to next-themes in your app.",
    category: "utilities",
    importLine: 'import { LightDarkThemeToggle } from "@arsenal/ui";',
    code: `"use client";
import { useTheme } from "next-themes";
import { LightDarkThemeToggle } from "@arsenal/ui";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const current = (resolvedTheme ?? theme) === "light" ? "light" : "dark";
  return (
    <LightDarkThemeToggle
      theme={current}
      onToggle={(next) => setTheme(next)}
    />
  );
}`,
  },
  {
    id: "cn",
    name: "cn",
    description: "clsx + tailwind-merge utility for className composition.",
    category: "utilities",
    importLine: 'import { cn } from "@arsenal/ui";',
    code: `import { cn } from "@arsenal/ui";

const classes = cn(
  "rounded-arsenal border border-arsenal-border p-4",
  isActive && "border-arsenal-accent shadow-arsenal-glow",
);`,
  },
];

export const COMPONENT_CATEGORIES: { id: ComponentCategory; label: string }[] = [
  { id: "cards", label: "Cards" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "navigation", label: "Navigation" },
  { id: "backgrounds", label: "Backgrounds" },
  { id: "utilities", label: "Utilities" },
];
