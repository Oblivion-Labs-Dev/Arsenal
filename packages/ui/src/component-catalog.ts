export type ComponentCategory =
  | 'hero'
  | 'cards'
  | 'dashboards'
  | 'data-display'
  | 'controls'
  | 'feedback'
  | 'buttons'
  | 'typography'
  | 'navigation'
  | 'backgrounds'
  | 'motion'
  | 'utilities'
  | 'effects';

export interface ComponentCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: ComponentCategory;
  importLine: string;
  props: string[];
  usage: string;
  accessibility: string;
  performance: string;
  code: string;
}

export const UI_SETUP_SNIPPET = `// 1. Install shared UI dependencies
pnpm add @arsenal/ui framer-motion

// 2. globals.css
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

// 4. Use one component or an entire module
import { GlassCard, NetworkBackground, PrimaryButton } from "@arsenal/ui";`;

export const UI_COMPONENT_CATALOG: ComponentCatalogEntry[] = [
  {
    id: 'vault-hero',
    name: 'VaultHeroPattern',
    description:
      'First-screen composition for repository tools: living mesh, hard metrics, and direct module entry.',
    category: 'hero',
    importLine: 'import { NetworkBackground, PrimaryButton } from "@arsenal/ui";',
    props: ['NetworkBackground density', 'NetworkBackground accent', 'PrimaryButton forge'],
    usage:
      'Use on product front doors where the background should feel reactive without taking over the workflow.',
    accessibility:
      'Keep all hero copy in regular HTML. The canvas remains decorative and aria-hidden.',
    performance:
      'Use the calm or standard mesh density for full-viewport heroes with other heavy content.',
    code: `import { NetworkBackground, PrimaryButton } from "@arsenal/ui";

export function VaultHero() {
  return (
    <section className="relative overflow-hidden rounded-arsenal-lg border border-arsenal-border p-8">
      <NetworkBackground density="standard" accent="ember" />
      <div className="relative z-10 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.24em] text-arsenal-accent">Developer vault</p>
        <h1 className="mt-4 text-5xl font-semibold">Build with context that reacts.</h1>
        <PrimaryButton forge className="mt-6">Open modules</PrimaryButton>
      </div>
    </section>
  );
}`,
  },
  {
    id: 'network-background',
    name: 'NetworkBackground',
    description:
      'Interactive canvas mesh migrated from the portfolio language and rebuilt as a reusable primitive.',
    category: 'backgrounds',
    importLine: 'import { NetworkBackground } from "@arsenal/ui";',
    props: [
      'density: calm | standard | dense',
      'accent: ember | cyan | steel',
      'interactive: boolean',
    ],
    usage:
      'Use behind heroes, dashboards, and labs where cursor movement should imply living repository relationships.',
    accessibility: 'Canvas is aria-hidden and respects prefers-reduced-motion.',
    performance:
      'Canvas density is area-aware and capped to avoid runaway particle counts on ultra-wide displays.',
    code: `import { NetworkBackground } from "@arsenal/ui";

export function HeroBackdrop() {
  return (
    <section className="relative min-h-[420px] overflow-hidden rounded-arsenal-lg">
      <NetworkBackground density="dense" accent="ember" />
      <div className="relative z-10 p-8">Developer vault content</div>
    </section>
  );
}`,
  },
  {
    id: 'glass-card',
    name: 'GlassCard',
    description: 'Frosted industrial panel with optional glow hover and spring motion.',
    category: 'cards',
    importLine: 'import { GlassCard } from "@arsenal/ui";',
    props: ['glow?: boolean', 'className?: string', 'onClick?: () => void'],
    usage: 'Use for repeated modules, dashboard tiles, and component previews.',
    accessibility:
      'Use semantic children. Add button/link semantics outside when the card is an action.',
    performance: 'Small Framer Motion hover transform only; no layout shift.',
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
    id: 'bento-card',
    name: 'BentoCard',
    description: 'Grid tile with icon slot and optional two-column span.',
    category: 'cards',
    importLine: 'import { BentoCard } from "@arsenal/ui";',
    props: ['title: string', 'description: string', 'icon?: ReactNode', 'span?: 1 | 2'],
    usage: 'Use in landing-page bento grids for module summaries and repository capabilities.',
    accessibility: 'Keep headings in document order; decorative icons should be aria-hidden.',
    performance: 'Static markup with no client state.',
    code: `import { BentoCard } from "@arsenal/ui";

export function Example() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <BentoCard title="Hybrid retrieval" description="TF-IDF ranking with graph-aware boosts." />
      <BentoCard span="2" title="Budget engine" description="Cap context before the model." />
    </div>
  );
}`,
  },
  {
    id: 'dashboard-card',
    name: 'DashboardCard',
    description: 'Metric tile with value, change line, and trend coloring.',
    category: 'dashboards',
    importLine: 'import { DashboardCard } from "@arsenal/ui";',
    props: ['title: string', 'value: string', 'change?: string', 'trend?: up | down | neutral'],
    usage: 'Use for repository health, token savings, test coverage, and deployment metrics.',
    accessibility: 'Trend color is accompanied by text; do not rely on color alone.',
    performance: 'Pure display component suitable for dense dashboard grids.',
    code: `import { DashboardCard } from "@arsenal/ui";

export function Example() {
  return <DashboardCard title="Tokens saved" value="92%" change="+14%" trend="up" />;
}`,
  },
  {
    id: 'feature-card',
    name: 'FeatureCard',
    description: 'Compact feature block with optional badge and children slot.',
    category: 'cards',
    importLine: 'import { FeatureCard } from "@arsenal/ui";',
    props: ['badge?: string', 'title: string', 'description: string', 'children?: ReactNode'],
    usage: 'Use to describe capability modules and installation paths.',
    accessibility: 'Badge text is plain text, not a status-only color indicator.',
    performance: 'Server-safe component with no effects.',
    code: `import { FeatureCard } from "@arsenal/ui";

export function Example() {
  return <FeatureCard badge="Module" title="Knowledge graph" description="Map code relationships." />;
}`,
  },
  {
    id: 'timeline-card',
    name: 'TimelineCard',
    description: 'Roadmap, release, or bootstrap step with optional active highlight.',
    category: 'cards',
    importLine: 'import { TimelineCard } from "@arsenal/ui";',
    props: ['year: string', 'title: string', 'description: string', 'active?: boolean'],
    usage: 'Use for setup sequences, migration plans, and release pipelines.',
    accessibility: 'Works inside ordered lists for step-by-step flows.',
    performance: 'Static card; active state only changes classes.',
    code: `import { TimelineCard } from "@arsenal/ui";

export function Example() {
  return <TimelineCard year="01" title="Scan repo" description="Build the graph." active />;
}`,
  },
  {
    id: 'section-header',
    name: 'SectionHeader',
    description: 'Page section title with eyebrow, subtitle, and optional action.',
    category: 'typography',
    importLine: 'import { SectionHeader } from "@arsenal/ui";',
    props: [
      'eyebrow?: string',
      'title: string',
      'subtitle?: string',
      'action?: ReactNode',
      'align?: left | center',
    ],
    usage: 'Use at the top of major content blocks.',
    accessibility: 'Preserves heading hierarchy through caller-provided placement.',
    performance: 'No runtime effects.',
    code: `import { SectionHeader, PrimaryButton } from "@arsenal/ui";

export function Example() {
  return <SectionHeader title="Composable systems" action={<PrimaryButton>Copy</PrimaryButton>} />;
}`,
  },
  {
    id: 'primary-button',
    name: 'PrimaryButton',
    description: 'Accent-filled CTA with magnetic hover motion.',
    category: 'buttons',
    importLine: 'import { PrimaryButton } from "@arsenal/ui";',
    props: ['forge?: boolean', 'children: ReactNode', 'onClick?: () => void'],
    usage: 'Use for one primary action in a viewport or panel.',
    accessibility: 'Native button semantics; visible focus inherited from design tokens.',
    performance: 'Small transform animation; honors reduced-motion through global token policy.',
    code: `import { PrimaryButton } from "@arsenal/ui";

export function Example() {
  return <PrimaryButton forge>Launch dashboard</PrimaryButton>;
}`,
  },
  {
    id: 'secondary-button',
    name: 'SecondaryButton',
    description: 'Outlined secondary action with magnetic hover.',
    category: 'buttons',
    importLine: 'import { SecondaryButton } from "@arsenal/ui";',
    props: ['children: ReactNode', 'onClick?: () => void'],
    usage: 'Use beside a primary CTA or for lower-risk actions.',
    accessibility: 'Native button semantics.',
    performance: 'No expensive effects.',
    code: `import { SecondaryButton } from "@arsenal/ui";

export function Example() {
  return <SecondaryButton>View docs</SecondaryButton>;
}`,
  },
  {
    id: 'command-palette',
    name: 'CommandPalette',
    description: 'Keyboard-first command surface for quick navigation and actions.',
    category: 'navigation',
    importLine: 'import { CommandPalette } from "@arsenal/ui";',
    props: ['none'],
    usage: 'Mount once near the app root; users open it with Cmd/Ctrl+K.',
    accessibility: 'Uses Radix Dialog primitives for focus trapping and escape handling.',
    performance: 'Idle until opened; command list is small and local.',
    code: `import { CommandPalette } from "@arsenal/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}`,
  },
  {
    id: 'orb-background',
    name: 'OrbBackground',
    description: 'Layered industrial glow for hero sections.',
    category: 'backgrounds',
    importLine: 'import { OrbBackground } from "@arsenal/ui";',
    props: ['className?: string'],
    usage: 'Use as a subtle light source behind panels.',
    accessibility: 'aria-hidden decorative layer.',
    performance: 'CSS-only gradients.',
    code: `import { OrbBackground } from "@arsenal/ui";

export function Example() {
  return <OrbBackground />;
}`,
  },
  {
    id: 'grid-background',
    name: 'GridBackground',
    description: 'Radial-masked engineering grid overlay.',
    category: 'backgrounds',
    importLine: 'import { GridBackground } from "@arsenal/ui";',
    props: ['className?: string'],
    usage: 'Use in hero and dashboard backgrounds to suggest precision.',
    accessibility: 'aria-hidden decorative layer.',
    performance: 'CSS-only background image.',
    code: `import { GridBackground } from "@arsenal/ui";

export function Example() {
  return <GridBackground />;
}`,
  },
  {
    id: 'scroll-reveal',
    name: 'ScrollReveal',
    description: 'Intersection-observer entrance animation with direction and delay.',
    category: 'motion',
    importLine: 'import { ScrollReveal } from "@arsenal/ui";',
    props: ['direction?: up | down | left | right', 'delay?: number', 'children: ReactNode'],
    usage: 'Use sparingly for narrative page sections.',
    accessibility: 'Global reduced-motion policy disables animation.',
    performance: 'IntersectionObserver avoids scroll listeners.',
    code: `import { ScrollReveal } from "@arsenal/ui";

export function Example() {
  return <ScrollReveal direction="up">Revealed content</ScrollReveal>;
}`,
  },
  {
    id: 'badge',
    name: 'Badge',
    description: 'Status and priority pill with variant coloring.',
    category: 'utilities',
    importLine: 'import { Badge } from "@arsenal/ui";',
    props: ['variant?: default | progress | p0 | p1 | p2', 'children: ReactNode'],
    usage: 'Use for component states, package status, and risk labels.',
    accessibility: 'Text label remains visible for screen readers and color-blind users.',
    performance: 'Class-only styling.',
    code: `import { Badge } from "@arsenal/ui";

export function Example() {
  return <Badge variant="progress">in progress</Badge>;
}`,
  },
  {
    id: 'cn',
    name: 'cn',
    description: 'clsx + tailwind-merge utility for className composition.',
    category: 'utilities',
    importLine: 'import { cn } from "@arsenal/ui";',
    props: ['...classes: ClassValue[]'],
    usage: 'Use in every reusable component to compose variants safely.',
    accessibility: 'Not visual; supports stable styling contracts.',
    performance: 'Tiny runtime helper.',
    code: `import { cn } from "@arsenal/ui";

const classes = cn("rounded-arsenal p-4", active && "border-arsenal-accent");`,
  },
  {
    id: 'metric-card',
    name: 'MetricCard',
    description: 'Semantic metric summary with trend, description, icon, and action slots.',
    category: 'data-display',
    importLine: 'import { MetricCard } from "@arsenal/ui";',
    props: [
      'label: string',
      'value: ReactNode',
      'description?: ReactNode',
      'trend?: MetricTrend',
      'tone?: MetricTone',
      'icon?: ReactNode',
      'action?: ReactNode',
      'className?: string',
    ],
    usage: 'Use for KPI and health summaries across dashboards and review panels.',
    accessibility: 'Trend and tone mapping should stay readable without color alone.',
    performance: 'Pure presentational card with no animation loops.',
    code: `import { MetricCard } from "@arsenal/ui";

export function Example() {
  return (
    <MetricCard
      label="Requests processed"
      value="24.8k"
      description="Across the last seven days"
      trend={{ label: "+8.4%", direction: "up", tone: "success" }}
      tone="accent"
    />
  );
}`,
  },
  {
    id: 'score-gauge',
    name: 'ScoreGauge',
    description: 'Accessible CSS conic-gradient meter with clamped values and semantic tones.',
    category: 'data-display',
    importLine: 'import { ScoreGauge } from "@arsenal/ui";',
    props: [
      'value: number',
      'min?: number',
      'max?: number',
      'label?: string',
      'description?: ReactNode',
      'tone?: ScoreGaugeTone',
      'size?: ScoreGaugeSize',
      'className?: string',
    ],
    usage: 'Use for coverage, readiness, and quality scores with bounded ranges.',
    accessibility: 'Exposes numeric value textually; meter is decorative surround.',
    performance: 'CSS-only meter with no canvas or frame loops.',
    code: `import { ScoreGauge } from "@arsenal/ui";

export function Example() {
  return (
    <ScoreGauge
      value={82}
      label="Coverage score"
      description="82 of 100 checks currently pass."
      tone="success"
    />
  );
}`,
  },
  {
    id: 'segmented-control',
    name: 'SegmentedControl',
    description: 'Typed single-select control backed by native radios for keyboard and form support.',
    category: 'controls',
    importLine: 'import { SegmentedControl } from "@arsenal/ui";',
    props: [
      'label: string',
      'options: SegmentedControlOption[]',
      'value: string',
      'onValueChange: (value: string) => void',
      'className?: string',
    ],
    usage: 'Use when a compact exclusive choice needs strong keyboard support.',
    accessibility: 'Native radios preserve focus, labeling, and form semantics.',
    performance: 'No animation dependencies.',
    code: `"use client";

import { useState } from "react";
import { SegmentedControl } from "@arsenal/ui";

const options = [
  { value: "cards", label: "Cards" },
  { value: "table", label: "Table" },
  { value: "timeline", label: "Timeline" },
] as const;

export function Example() {
  const [view, setView] = useState<(typeof options)[number]["value"]>("cards");
  return (
    <SegmentedControl
      label="Choose a view"
      options={options}
      value={view}
      onValueChange={setView}
    />
  );
}`,
  },
  {
    id: 'disclosure-section',
    name: 'DisclosureSection',
    description: 'Controlled or uncontrolled accessible section with summary, metadata, and action slots.',
    category: 'controls',
    importLine: 'import { DisclosureSection } from "@arsenal/ui";',
    props: [
      'title: string',
      'summary?: ReactNode',
      'meta?: ReactNode',
      'defaultOpen?: boolean',
      'open?: boolean',
      'onOpenChange?: (open: boolean) => void',
      'children: ReactNode',
      'className?: string',
    ],
    usage: 'Use to keep dense secondary content available without crowding the page.',
    accessibility: 'Button trigger with expanded state announcements.',
    performance: 'No heavy motion; layout remains CSS-driven.',
    code: `import { DisclosureSection } from "@arsenal/ui";

export function Example() {
  return (
    <DisclosureSection
      title="Implementation details"
      summary="Configuration, limits, and operational notes"
      meta="3 items"
      defaultOpen
    >
      <p>Dense content stays available without overwhelming the surrounding page.</p>
    </DisclosureSection>
  );
}`,
  },
  {
    id: 'state-panel',
    name: 'StatePanel',
    description: 'Consistent empty, loading, and error feedback with live-region semantics.',
    category: 'feedback',
    importLine: 'import { StatePanel } from "@arsenal/ui";',
    props: [
      'kind: empty | loading | error',
      'title: string',
      'description?: ReactNode',
      'action?: ReactNode',
      'size?: compact | default',
      'className?: string',
    ],
    usage: 'Use for empty, loading, and error states across product surfaces.',
    accessibility: 'Live-region semantics communicate status changes to assistive tech.',
    performance: 'Lightweight presentational panel.',
    code: `import { StatePanel } from "@arsenal/ui";

export function Example() {
  return (
    <StatePanel
      kind="empty"
      title="Nothing here yet"
      description="Create the first item to populate this view."
      action={<button type="button">Create item</button>}
    />
  );
}`,
  },
  {
    id: 'animated-number',
    name: 'AnimatedNumber',
    description: 'Tabular figure that counts up to its value and re-animates when the value changes.',
    category: 'data-display',
    importLine: 'import { AnimatedNumber } from "@arsenal/ui";',
    props: [
      'value: number | null',
      'format?: (value: number) => string',
      'placeholder?: string',
      'suffix?: string',
      'durationMs?: number',
      'delayMs?: number',
      'decimals?: number',
      'startFrom?: number | null',
    ],
    usage:
      'Use for headline figures on dashboards. A null value renders the placeholder, never a fake zero. CountUp is an alias.',
    accessibility:
      'Renders a plain span with tabular numerals; null values are labelled "unknown". Reduced motion jumps to the final value.',
    performance:
      'Single requestAnimationFrame tween per figure; no layout shift thanks to tabular numerals.',
    code: `import { AnimatedNumber } from "@arsenal/ui";

export function Example() {
  return (
    <p className="text-4xl font-semibold">
      <AnimatedNumber value={1284.5} decimals={1} delayMs={120} suffix=" pts" />
    </p>
  );
}`,
  },
  {
    id: 'delta-pill',
    name: 'DeltaPill',
    description: 'Signed change pill with success, danger, or muted tone and an arrow glyph.',
    category: 'data-display',
    importLine: 'import { DeltaPill } from "@arsenal/ui";',
    props: [
      'value: number | null',
      'kind?: pct | money',
      'label?: string',
      'unknownText?: string',
      'currency?: string',
      'locale?: string',
    ],
    usage:
      'Use next to a KPI to show change. pct values are fractions (0.012 is 1.2%); null shows the unknown text.',
    accessibility:
      'Direction is carried by sign and arrow text as well as colour. Pass label to name what changed.',
    performance: 'Pure presentational span.',
    code: `import { DeltaPill } from "@arsenal/ui";

export function Example() {
  return (
    <div className="flex gap-2">
      <DeltaPill value={0.034} label="vs last week" />
      <DeltaPill value={-1250} kind="money" currency="USD" />
      <DeltaPill value={null} />
    </div>
  );
}`,
  },
  {
    id: 'sparkline',
    name: 'Sparkline',
    description: 'Tiny dependency-free SVG trend line that tolerates missing values.',
    category: 'data-display',
    importLine: 'import { Sparkline } from "@arsenal/ui";',
    props: [
      'values: (number | null)[]',
      'label: string',
      'width?: number',
      'height?: number',
      'tone?: auto | accent | info',
      'emptyText?: string',
    ],
    usage: 'Use inside table rows and KPI tiles. tone auto colours by overall direction.',
    accessibility:
      'Exposes label as the accessible name; empty data renders readable fallback text.',
    performance: 'Static SVG path computed from the values; no chart runtime.',
    code: `import { Sparkline } from "@arsenal/ui";

export function Example() {
  return (
    <Sparkline values={[4, 6, 5, 9, null, 12, 11]} label="Stars, last 7 days" width={120} height={32} />
  );
}`,
  },
  {
    id: 'score-ring',
    name: 'ScoreRing',
    description: 'Circular score meter with centred value and plain-language meaning.',
    category: 'data-display',
    importLine: 'import { ScoreRing } from "@arsenal/ui";',
    props: [
      'score: number | null',
      'max?: number',
      'label: string',
      'meaning?: string',
      'size?: number',
      'animateOnEntry?: boolean',
    ],
    usage: 'Use for a single bounded score. A null score renders as unknown rather than zero.',
    accessibility:
      'Label and meaning are exposed to assistive tech; the value is never colour-only.',
    performance: 'One SVG arc; the entry animation respects reduced motion.',
    code: `import { ScoreRing } from "@arsenal/ui";

export function Example() {
  return (
    <ScoreRing score={82} max={100} label="Health score" meaning="Above the portfolio median" size={120} />
  );
}`,
  },
  {
    id: 'semi-gauge',
    name: 'SemiGauge',
    description: 'Half-circle gauge with coloured bands, needle, and optional legend.',
    category: 'data-display',
    importLine: 'import { SemiGauge } from "@arsenal/ui";',
    props: [
      'share: number | null',
      'label: string',
      'bands?: { from, to, color, label }[]',
      'valueLabel?: string',
      'showLegend?: boolean',
      'width?: number',
    ],
    usage:
      'Use to place a 0 to 1 share inside named zones. DEFAULT_SEMI_GAUGE_BANDS supplies a standard set.',
    accessibility: 'Band names appear in the legend so meaning never depends on colour alone.',
    performance: 'Static SVG geometry; no runtime dependency.',
    code: `import { SemiGauge } from "@arsenal/ui";

export function Example() {
  return <SemiGauge share={0.64} label="Risk appetite" valueLabel="64%" showLegend width={260} />;
}`,
  },
  {
    id: 'treemap',
    name: 'Treemap',
    description: 'Squarified, keyboard-navigable treemap coloured by a signed value.',
    category: 'data-display',
    importLine: 'import { Treemap } from "@arsenal/ui";',
    props: [
      'items: readonly T[]',
      'getKey: (item) => string',
      'getLabel: (item) => string',
      'getWeight?: (item) => number | undefined',
      'getValue: (item) => number | null',
      'formatValue?: (value) => string',
      'domain?: number',
      'colorFor?: (value, item) => string | null',
      'onSelect?: (item) => void',
      'label: string',
      'hideLegend?: boolean',
    ],
    usage:
      'Use for market maps and portfolio breakdowns where tile area is weight and colour is change.',
    accessibility:
      'Tiles are focusable with arrow-key movement; values are printed on tiles, not colour-only.',
    performance: 'Layout is computed once per items change in plain DOM and SVG.',
    code: `import { Treemap } from "@arsenal/ui";

const rows = [
  { symbol: "AAPL", cap: 3000, change: 0.012 },
  { symbol: "MSFT", cap: 2800, change: -0.004 },
  { symbol: "NVDA", cap: 2200, change: 0.031 },
];

export function Example() {
  return (
    <Treemap
      items={rows}
      label="Market map"
      getKey={(r) => r.symbol}
      getLabel={(r) => r.symbol}
      getWeight={(r) => r.cap}
      getValue={(r) => r.change}
    />
  );
}`,
  },
  {
    id: 'donut-chart',
    name: 'DonutChart',
    description: 'Segmented donut with centre readout and selectable segments.',
    category: 'data-display',
    importLine: 'import { DonutChart } from "@arsenal/ui";',
    props: [
      'segments: { key, label, value: number | null, color? }[]',
      'label: string',
      'centerValue?: ReactNode',
      'centerLabel?: string',
      'onSelectSegment?: (segment) => void',
      'size?: number',
    ],
    usage:
      'Use for part-of-whole splits with a handful of segments. DONUT_PALETTE provides default colours.',
    accessibility: 'Segments are listed in an accessible data table alongside the SVG.',
    performance: 'Static SVG arcs; no chart runtime.',
    code: `import { DonutChart } from "@arsenal/ui";

export function Example() {
  return (
    <DonutChart
      label="Allocation by sector"
      centerValue="$48k"
      centerLabel="Total"
      segments={[
        { key: "tech", label: "Tech", value: 52 },
        { key: "energy", label: "Energy", value: 18 },
        { key: "cash", label: "Cash", value: 30 },
      ]}
    />
  );
}`,
  },
  {
    id: 'stacked-bar-chart',
    name: 'StackedBarChart',
    description: 'Stacked columns across rows with a typed series key and hover totals.',
    category: 'data-display',
    importLine: 'import { StackedBarChart } from "@arsenal/ui";',
    props: [
      'series: { key, label, color }[]',
      'rows: { label, values: Record<key, number | null> }[]',
      'label: string',
      'height?: number',
      'emptyText?: string',
    ],
    usage: 'Use to compare composition over time or across groups.',
    accessibility: 'A data table fallback exposes every value; series are named in the legend.',
    performance: 'Plain SVG rects; re-renders only on data change.',
    code: `import { StackedBarChart } from "@arsenal/ui";

export function Example() {
  return (
    <StackedBarChart
      label="Runs by outcome"
      series={[
        { key: "pass", label: "Passed", color: "var(--arsenal-success)" },
        { key: "fail", label: "Failed", color: "var(--arsenal-danger)" },
      ]}
      rows={[
        { label: "Mon", values: { pass: 12, fail: 2 } },
        { label: "Tue", values: { pass: 9, fail: 4 } },
      ]}
    />
  );
}`,
  },
  {
    id: 'line-chart',
    name: 'LineChart',
    description: 'Simple labelled SVG line chart that breaks the line at missing values.',
    category: 'data-display',
    importLine: 'import { LineChart } from "@arsenal/ui";',
    props: [
      'points: { label, value: number | null }[]',
      'label: string',
      'unit?: string',
      'min?: number',
      'max?: number',
      'color?: string',
      'emptyText?: string',
    ],
    usage:
      'Use for short single-series trends. Reach for TimeSeriesChart when you need zoom or candles.',
    accessibility: 'Provides a data table fallback and a descriptive label.',
    performance: 'Static SVG; no chart runtime.',
    code: `import { LineChart } from "@arsenal/ui";

export function Example() {
  return (
    <LineChart
      label="Win rate"
      unit="%"
      points={[
        { label: "Jan", value: 48 },
        { label: "Feb", value: 53 },
        { label: "Mar", value: null },
        { label: "Apr", value: 57 },
      ]}
    />
  );
}`,
  },
  {
    id: 'distribution-bars',
    name: 'DistributionBars',
    description: 'Horizontal bars showing each bucket share of a total.',
    category: 'data-display',
    importLine: 'import { DistributionBars } from "@arsenal/ui";',
    props: ['buckets: { key, label, count: number | null }[]', 'label: string', 'color?: string'],
    usage: 'Use for histograms and category counts where exact shares matter.',
    accessibility: 'Counts and percentages are printed as text beside each bar.',
    performance: 'CSS-width bars; no chart runtime.',
    code: `import { DistributionBars } from "@arsenal/ui";

export function Example() {
  return (
    <DistributionBars
      label="Holding period"
      buckets={[
        { key: "d1", label: "Under 1 day", count: 14 },
        { key: "w1", label: "1 to 7 days", count: 31 },
        { key: "m1", label: "Over a week", count: 9 },
      ]}
    />
  );
}`,
  },
  {
    id: 'time-series-chart',
    name: 'TimeSeriesChart',
    description:
      'Lazy-loaded Lightweight Charts wrapper for line, area, histogram, and candlestick series.',
    category: 'data-display',
    importLine: 'import { TimeSeriesChart } from "@arsenal/ui";',
    props: [
      'series: TimeSeriesSpec[]',
      'label: string',
      'priceLines?: { seriesId, price, title?, color?, dashed? }[]',
      'markers?: { seriesId, time, position?, shape?, text?, color? }[]',
      'fitContent?: boolean',
      'mainPaneStretch?: number',
    ],
    usage:
      'Use for price and equity charts with panes, price lines, and markers. Colours accept --arsenal-* token names.',
    accessibility:
      'Canvas chart: always supply a meaningful label and surface key figures as text nearby.',
    performance: 'The charting library loads on demand, so it stays out of the initial bundle.',
    code: `import { TimeSeriesChart } from "@arsenal/ui";

export function Example() {
  return (
    <TimeSeriesChart
      label="Equity curve"
      fitContent
      series={[
        {
          id: "equity",
          type: "area",
          color: "--arsenal-accent",
          data: [
            { time: "2026-01-02", value: 100 },
            { time: "2026-01-03", value: 103 },
            { time: "2026-01-04", value: 101 },
          ],
        },
      ]}
      priceLines={[{ seriesId: "equity", price: 100, title: "Start", dashed: true }]}
    />
  );
}`,
  },
  {
    id: 'drawdown-chart',
    name: 'DrawdownChart',
    description:
      'Underwater chart derived from an equity curve, with worst drawdown and recovery summary.',
    category: 'data-display',
    importLine: 'import { DrawdownChart } from "@arsenal/ui";',
    props: [
      'points: { date: string; equity: number }[]',
      'label?: string',
      'formatDate?: (date: string) => string',
    ],
    usage: 'Pass the raw equity points; drawdown is calculated for you via calculateDrawdown.',
    accessibility: 'Worst drawdown and recovery date are stated in text.',
    performance: 'Static SVG derived from the points.',
    code: `import { DrawdownChart } from "@arsenal/ui";

export function Example() {
  return (
    <DrawdownChart
      label="Strategy drawdown"
      points={[
        { date: "2026-01-02", equity: 100 },
        { date: "2026-01-09", equity: 112 },
        { date: "2026-01-16", equity: 98 },
        { date: "2026-01-23", equity: 115 },
      ]}
    />
  );
}`,
  },
  {
    id: 'data-ridge-background',
    name: 'DataRidgeBackground',
    description: 'Decorative ridge-line backdrop shaped by a real data series.',
    category: 'backgrounds',
    importLine: 'import { DataRidgeBackground } from "@arsenal/ui";',
    props: [
      'series?: { label, from, to, values: number[] }',
      'children?: ReactNode',
      'className?: string',
    ],
    usage: 'Use behind a hero so the page signature is the product data itself.',
    accessibility: 'Decorative and aria-hidden; keep all copy in regular HTML children.',
    performance: 'Single SVG path; no animation loop.',
    code: `import { DataRidgeBackground } from "@arsenal/ui";

export function Example() {
  return (
    <DataRidgeBackground
      series={{ label: "Daily volume", from: "2026-01-01", to: "2026-01-07", values: [4, 7, 5, 9, 12, 8, 10] }}
      className="min-h-[320px]"
    >
      <h1 className="p-8 text-4xl font-semibold">Markets at a glance</h1>
    </DataRidgeBackground>
  );
}`,
  },
  {
    id: 'form-fields',
    name: 'Form fields',
    description:
      'Input, Textarea, Select, and SearchInput sharing one label, hint, and error shell.',
    category: 'controls',
    importLine: 'import { Input, Textarea, Select, SearchInput } from "@arsenal/ui";',
    props: [
      'label?: ReactNode',
      'hint?: ReactNode',
      'error?: ReactNode',
      'wrapperClassName?: string',
      'SearchInput value: string',
      'SearchInput onValueChange: (value: string) => void',
      'SearchInput clearLabel?: string',
      'native input, textarea, and select attributes',
    ],
    usage: 'Use for every text entry. Hint and error text are wired automatically to the control.',
    accessibility:
      'Labels use htmlFor, hint and error are linked with aria-describedby, and error sets aria-invalid.',
    performance: 'Thin wrappers over native elements.',
    code: `import { useState } from "react";
import { Input, Select, SearchInput } from "@arsenal/ui";

export function Example() {
  const [query, setQuery] = useState("");
  return (
    <form className="grid max-w-sm gap-4">
      <Input label="Email" type="email" hint="We never share it." />
      <Select label="Plan" defaultValue="pro">
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </Select>
      <SearchInput value={query} onValueChange={setQuery} placeholder="Search repos" clearLabel="Clear search" />
    </form>
  );
}`,
  },
  {
    id: 'card',
    name: 'Card',
    description:
      'Base surface with standard, interactive, status, and insight variants plus header, body, and footer parts.',
    category: 'cards',
    importLine: 'import { Card, CardHeader, CardBody, CardFooter } from "@arsenal/ui";',
    props: [
      'variant?: standard | interactive | status | insight',
      'status?: success | active | attention | danger | info | neutral',
      'padding?: none | compact | default',
      'selected?: boolean',
      'onActivate?: () => void',
      'CardHeader eyebrow?, title?, action?',
    ],
    usage:
      'Use as the default container. Interactive cards become keyboard-activatable when onActivate is set.',
    accessibility:
      'Interactive cards get button semantics and a focus ring; status is paired with text, not colour only.',
    performance: 'Plain element with CSS transitions only.',
    code: `import { Card, CardHeader, CardBody, CardFooter } from "@arsenal/ui";

export function Example() {
  return (
    <Card variant="status" status="success" onActivate={() => console.log("open")}>
      <CardHeader eyebrow="Pipeline" title="Nightly build" />
      <CardBody>All 42 checks passed.</CardBody>
      <CardFooter>Finished 3 minutes ago</CardFooter>
    </Card>
  );
}`,
  },
  {
    id: 'skeleton',
    name: 'Skeleton and LoadingPlaceholder',
    description: 'Shimmer skeleton primitives and ready-made loading layouts.',
    category: 'feedback',
    importLine: 'import { Skeleton, SkeletonText, LoadingPlaceholder } from "@arsenal/ui";',
    props: [
      'Skeleton variant?: text | title | block',
      'Skeleton width?, height?',
      'LoadingPlaceholder label: string',
      'LoadingPlaceholder shape?: panel | list | grid | page',
      'LoadingPlaceholder rows?: number',
    ],
    usage: 'Use LoadingPlaceholder for whole regions and Skeleton to shape custom loading rows.',
    accessibility:
      'LoadingPlaceholder announces its label politely; skeleton pieces are decorative.',
    performance: 'CSS shimmer only; reduced motion disables it.',
    code: `import { LoadingPlaceholder, Skeleton } from "@arsenal/ui";

export function Example() {
  return (
    <div className="grid gap-6">
      <LoadingPlaceholder label="Loading repositories" shape="list" rows={4} />
      <Skeleton variant="block" height={96} />
    </div>
  );
}`,
  },
  {
    id: 'error-state',
    name: 'ErrorState',
    description:
      'Error boundary panel with retry, optional reporting, and a copyable error reference.',
    category: 'feedback',
    importLine: 'import { ErrorState } from "@arsenal/ui";',
    props: [
      'title: string',
      'description?: ReactNode',
      'error?: (Error & { digest?: string }) | null',
      'onRetry?: () => void',
      'retryLabel?: string',
      'fallback?: ReactNode',
      'onReport?: (error) => void',
      'referenceLabel?: string',
    ],
    usage:
      'Use in error.tsx files and failed data panels. Wire onReport so errors are logged, never swallowed.',
    accessibility: 'Rendered as an alert so the failure is announced; retry is a real button.',
    performance: 'Lightweight presentational panel.',
    code: `import { ErrorState } from "@arsenal/ui";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Could not load the dashboard"
      error={error}
      onRetry={reset}
      onReport={(e) => console.error(e)}
    />
  );
}`,
  },
  {
    id: 'tabs',
    name: 'Tabs',
    description: 'Accessible tab list with counts, icons, and arrow-key navigation.',
    category: 'navigation',
    importLine: 'import { Tabs } from "@arsenal/ui";',
    props: [
      'items: { id, label, count?, icon?, disabled? }[]',
      'value: Id',
      'onChange: (id) => void',
      'ariaLabel: string',
      'idBase?: string',
      'orientation?: horizontal | vertical',
      'size?: sm | md',
    ],
    usage:
      'Use for switching panels in place. Pair with tabId and tabPanelId so panels link to their tab.',
    accessibility: 'Implements the tablist pattern with roving focus, arrow, Home, and End keys.',
    performance: 'Controlled, stateless component.',
    code: `import { useState } from "react";
import { Tabs } from "@arsenal/ui";

export function Example() {
  const [tab, setTab] = useState("overview");
  return (
    <Tabs
      ariaLabel="Repository sections"
      value={tab}
      onChange={setTab}
      items={[
        { id: "overview", label: "Overview" },
        { id: "issues", label: "Issues", count: 12 },
        { id: "archived", label: "Archived", disabled: true },
      ]}
    />
  );
}`,
  },
  {
    id: 'animated-tabs',
    name: 'AnimatedTabs',
    description: 'Scrollable tab strip with a sliding indicator and edge fades.',
    category: 'navigation',
    importLine: 'import { AnimatedTabs } from "@arsenal/ui";',
    props: [
      'items: { id, label }[]',
      'value: Id',
      'onChange: (id) => void',
      'ariaLabel: string',
      'idBase?: string',
    ],
    usage:
      'Use for many tabs that may overflow, where the indicator should glide to the active tab.',
    accessibility:
      'Same tablist keyboard model as Tabs; indicator motion respects reduced motion.',
    performance:
      'One transformed indicator element; scroll edges are measured on scroll and resize only.',
    code: `import { useState } from "react";
import { AnimatedTabs } from "@arsenal/ui";

export function Example() {
  const [tab, setTab] = useState("day");
  return (
    <AnimatedTabs
      ariaLabel="Range"
      value={tab}
      onChange={setTab}
      items={[
        { id: "day", label: "1D" },
        { id: "week", label: "1W" },
        { id: "month", label: "1M" },
      ]}
    />
  );
}`,
  },
  {
    id: 'filter-chip',
    name: 'FilterChip',
    description: 'Toggle chip for filters with an optional count.',
    category: 'controls',
    importLine: 'import { FilterChip } from "@arsenal/ui";',
    props: ['label: string', 'active?: boolean', 'count?: number', 'native button attributes'],
    usage: 'Use in filter rows where each chip toggles one facet.',
    accessibility: 'Button with aria-pressed reflecting active state.',
    performance: 'Lightweight presentational button.',
    code: `import { useState } from "react";
import { FilterChip } from "@arsenal/ui";

export function Example() {
  const [on, setOn] = useState(true);
  return <FilterChip label="Open issues" count={12} active={on} onClick={() => setOn(!on)} />;
}`,
  },
  {
    id: 'facet-filter-dropdown',
    name: 'FacetFilterDropdown',
    description: 'Searchable single-select dropdown listing facet values with counts.',
    category: 'controls',
    importLine: 'import { FacetFilterDropdown } from "@arsenal/ui";',
    props: [
      'items: readonly [value, count][]',
      'value: string',
      'onChange: (value) => void',
      'totalCount: number',
      'ariaLabel: string',
      'allLabel?: string',
      'searchPlaceholder?: string',
      'emptySearchLabel?: string',
      'clearLabel?: string',
      'icon?: ReactNode',
      'debounceMs?: number',
      'searchThreshold?: number',
    ],
    usage:
      'Use for filtering a list by a facet with many values. Search appears once items pass searchThreshold.',
    accessibility: 'Keyboard operable listbox with a labelled trigger and search field.',
    performance: 'Search is debounced and filtered in memory.',
    code: `import { useState } from "react";
import { FacetFilterDropdown } from "@arsenal/ui";

export function Example() {
  const [lang, setLang] = useState("");
  return (
    <FacetFilterDropdown
      ariaLabel="Filter by language"
      value={lang}
      onChange={setLang}
      totalCount={120}
      allLabel="All languages"
      items={[["TypeScript", 64], ["Python", 38], ["Rust", 18]]}
    />
  );
}`,
  },
  {
    id: 'table-view',
    name: 'Table view helpers',
    description:
      'useTableView hook with SortHeader and TableViewToggle for sortable, collapsible tables.',
    category: 'data-display',
    importLine: 'import { useTableView, SortHeader, TableViewToggle } from "@arsenal/ui";',
    props: [
      'useTableView(rows, value, options)',
      'options.initialKey: K',
      'options.initialDirection?: asc | desc',
      'options.pageSize?: number',
      'SortHeader label, ariaSort, arrow, onSort, align?',
      'TableViewToggle total, expanded, onToggle, pageSize?',
    ],
    usage:
      'Use for small tables that sort by column and collapse to the first rows. Define the value getter outside the component so it stays stable.',
    accessibility:
      'SortHeader renders a button for the column title; put aria-sort on the th using the hook ariaSort.',
    performance: 'Sorting is memoised on rows, sort state, and the value getter.',
    code: `import { useTableView, SortHeader, TableViewToggle } from "@arsenal/ui";

type Row = { name: string; stars: number };
type Key = "name" | "stars";

const rows: Row[] = [
  { name: "arsenal", stars: 120 },
  { name: "vault", stars: 45 },
];
const value = (row: Row, key: Key) => row[key];

export function Example() {
  const t = useTableView(rows, value, { initialKey: "stars", pageSize: 5 });
  return (
    <>
      <table>
        <thead>
          <tr>
            <SortHeader label="Name" ariaSort={t.ariaSort("name")} arrow={t.arrow("name")} onSort={() => t.toggleSort("name")} />
            <SortHeader label="Stars" align="right" ariaSort={t.ariaSort("stars")} arrow={t.arrow("stars")} onSort={() => t.toggleSort("stars")} />
          </tr>
        </thead>
        <tbody>
          {t.visibleRows.map((r) => (
            <tr key={r.name}><td>{r.name}</td><td>{r.stars}</td></tr>
          ))}
        </tbody>
      </table>
      <TableViewToggle total={t.total} pageSize={t.pageSize} expanded={t.expanded} onToggle={t.toggleExpanded} />
    </>
  );
}`,
  },
  {
    id: 'kpi-card',
    name: 'KpiCard',
    description:
      'Headline metric tile with counting value, meter, hover insight, and optional action link.',
    category: 'dashboards',
    importLine: 'import { KpiCard } from "@arsenal/ui";',
    props: [
      'label: ReactNode',
      'value: string | number | null',
      'icon?: ReactNode',
      'accent?: accent | amber | blue | cyan | gold | violet | success | danger',
      'hint?: ReactNode',
      'meter?: number',
      'insight?: { eyebrow?, headline, detail?, rows? }',
      'action?: { href, label }',
      'linkComponent?: ComponentType',
      'delay?: number',
      'detailsLabel?: ReactNode',
    ],
    usage:
      'Use for top-of-dashboard figures. Pass linkComponent (for example next/link) so actions stay client-side.',
    accessibility:
      'Insight is reachable by focus as well as hover; null values show an explicit unknown state.',
    performance: 'Numeric values count up once; delay staggers a row of cards.',
    code: `import { KpiCard } from "@arsenal/ui";

export function Example() {
  return (
    <KpiCard
      label="Open positions"
      value={14}
      accent="cyan"
      meter={0.7}
      hint="3 added today"
      insight={{
        headline: "Concentrated in tech",
        rows: [
          { label: "Tech", value: "9" },
          { label: "Energy", value: "5" },
        ],
      }}
      action={{ href: "/positions", label: "View all" }}
    />
  );
}`,
  },
  {
    id: 'confirm-dialog',
    name: 'ConfirmDialog',
    description: 'Trigger-driven confirmation dialog with busy and error states.',
    category: 'feedback',
    importLine: 'import { ConfirmDialog } from "@arsenal/ui";',
    props: [
      'trigger: ReactNode',
      'title: ReactNode',
      'description?: ReactNode',
      'confirmLabel?: ReactNode',
      'cancelLabel?: ReactNode',
      'busyLabel?: ReactNode',
      'onConfirm: () => void | Promise<void>',
      'busy?: boolean',
      'error?: ReactNode',
      'tone?: danger | accent',
    ],
    usage:
      'Use before destructive or irreversible actions. Surface failures from onConfirm through error.',
    accessibility: 'Modal dialog with focus trap, Escape to cancel, and labelled title and description.',
    performance: 'Renders its panel only while open.',
    code: `import { ConfirmDialog } from "@arsenal/ui";

export function Example() {
  return (
    <ConfirmDialog
      trigger={<button type="button">Delete repo</button>}
      title="Delete this repository?"
      description="This cannot be undone."
      confirmLabel="Delete"
      tone="danger"
      onConfirm={async () => {
        await fetch("/api/repos/1", { method: "DELETE" });
      }}
    />
  );
}`,
  },
  {
    id: 'side-panel',
    name: 'SidePanel',
    description: 'Modal side drawer or centred panel with focus trap and scroll lock.',
    category: 'feedback',
    importLine: 'import { SidePanel } from "@arsenal/ui";',
    props: [
      'open: boolean',
      'onClose: () => void',
      'children: ReactNode',
      'variant?: side | center',
      'backdropLabel?: string',
      'ariaLabelledBy?: string',
      'role?: dialog | status',
      'ariaLive?: polite | assertive | off',
      'animate?: PanelAnimator',
      'exitMs?: number',
    ],
    usage:
      'Use for detail views that should keep the list visible. Supply animate to plug in your own motion library.',
    accessibility:
      'Traps focus, restores it on close, closes on Escape and backdrop click, and compensates for the scrollbar.',
    performance:
      'Mounted only while open or exiting; animation is injected, so the base stays dependency-free.',
    code: `import { useState } from "react";
import { SidePanel } from "@arsenal/ui";

export function Example() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Details</button>
      <SidePanel open={open} onClose={() => setOpen(false)} ariaLabelledBy="panel-title">
        <h2 id="panel-title" className="p-6 text-xl font-semibold">Repository details</h2>
      </SidePanel>
    </>
  );
}`,
  },
  {
    id: 'side-by-side-diff',
    name: 'SideBySideDiff',
    description: 'Git diff viewer with side-by-side and unified modes.',
    category: 'data-display',
    importLine: 'import { SideBySideDiff } from "@arsenal/ui";',
    props: [
      'files: readonly FileDiff[]',
      'stats?: { additions, deletions }',
      'initialMode?: side-by-side | unified',
      'beforeLabel?: string',
      'afterLabel?: string',
      'emptyMessage?: string',
      'onOpenTarget?: (target) => void',
    ],
    usage:
      'Use for change review. Parsed diffs map to FileDiff with hunks of context, addition, and deletion lines.',
    accessibility:
      'Additions and deletions carry +/- markers, not colour alone; the mode switch is a labelled control.',
    performance: 'Plain DOM rows; deletions are paired with additions once per hunk.',
    code: `import { SideBySideDiff } from "@arsenal/ui";

export function Example() {
  return (
    <SideBySideDiff
      beforeLabel="main"
      afterLabel="feature"
      files={[
        {
          file: "src/app.ts",
          status: "modified",
          additions: 1,
          deletions: 1,
          hunks: [
            {
              header: "@@ -1,2 +1,2 @@",
              oldStart: 1,
              oldLines: 2,
              newStart: 1,
              newLines: 2,
              lines: [
                { type: "context", content: "const a = 1;", oldLineNumber: 1, newLineNumber: 1 },
                { type: "deletion", content: "const b = 2;", oldLineNumber: 2 },
                { type: "addition", content: "const b = 3;", newLineNumber: 2 },
              ],
            },
          ],
        },
      ]}
    />
  );
}`,
  },
  {
    id: 'asset-icon',
    name: 'AssetIcon',
    description: 'Decorative image icon resolved from a base path and a name.',
    category: 'utilities',
    importLine: 'import { AssetIcon } from "@arsenal/ui";',
    props: ['name: string', 'basePath: string', 'ext?: string', 'size?: number'],
    usage: 'Use for brand or asset glyphs served from an app public folder.',
    accessibility: 'Decorative: rendered with empty alt, so put the meaning in adjacent text.',
    performance: 'Fixed dimensions avoid layout shift.',
    code: `import { AssetIcon } from "@arsenal/ui";

export function Example() {
  return (
    <span className="inline-flex items-center gap-2">
      <AssetIcon name="bitcoin" basePath="/icons" ext="svg" size={20} />
      Bitcoin
    </span>
  );
}`,
  },
  {
    id: 'initials-avatar',
    name: 'InitialsAvatar',
    description: 'Deterministic coloured initials avatar.',
    category: 'utilities',
    importLine: 'import { InitialsAvatar } from "@arsenal/ui";',
    props: [
      'name: string',
      'seed?: string',
      'size?: number',
      'letters?: number',
      'palette?: readonly string[]',
      'label?: boolean',
    ],
    usage:
      'Use where no profile image exists. The same name or seed always yields the same colour.',
    accessibility: 'Set label to expose the name to assistive tech; otherwise it is decorative.',
    performance: 'Pure span; colour comes from a string hash.',
    code: `import { InitialsAvatar } from "@arsenal/ui";

export function Example() {
  return <InitialsAvatar name="Ada Lovelace" size={40} letters={2} label />;
}`,
  },
  {
    id: 'upload-zone',
    name: 'UploadZone',
    description: 'Drag-and-drop or click file target with progress.',
    category: 'controls',
    importLine: 'import { UploadZone } from "@arsenal/ui";',
    props: [
      'title: string',
      'hint?: string',
      'accept?: string',
      'onFile: (file, onProgress) => Promise<void> | void',
      'progress?: number | null',
      'compact?: boolean',
      'disabled?: boolean',
    ],
    usage:
      'Use for single-file uploads. Restrict types with accept and report progress (0 to 1) through onProgress.',
    accessibility: 'Keyboard-activatable control backed by a real file input.',
    performance: 'No upload logic bundled; you own the transport.',
    code: `import { UploadZone } from "@arsenal/ui";

export function Example() {
  return (
    <UploadZone
      title="Drop a CSV here"
      hint="Up to 5 MB"
      accept=".csv"
      onFile={async (file, onProgress) => {
        onProgress(0.5);
        await fetch("/api/upload", { method: "POST", body: file });
        onProgress(1);
      }}
    />
  );
}`,
  },
  {
    id: 'flip-clock',
    name: 'FlipClock',
    description: 'Live flip-style clock with optional seconds, 12-hour mode, and time zone.',
    category: 'motion',
    importLine: 'import { FlipClock } from "@arsenal/ui";',
    props: ['hour12?: boolean', 'seconds?: boolean', 'locale?: string', 'timeZone?: string', 'scale?: number'],
    usage: 'Use as a header or hero accent, for example showing market time in a given zone.',
    accessibility: 'Flip motion respects prefers-reduced-motion.',
    performance: 'Ticks once per second and updates only digits that change.',
    code: `import { FlipClock } from "@arsenal/ui";

export function Example() {
  return <FlipClock timeZone="America/New_York" hour12={false} seconds scale={0.8} />;
}`,
  },
  {
    id: 'table-of-contents',
    name: 'TableOfContents',
    description: 'Heading list with an active-section highlight.',
    category: 'navigation',
    importLine: 'import { TableOfContents } from "@arsenal/ui";',
    props: [
      'items: { id, text, level: 2 | 3 }[]',
      'variant?: minimal | default',
      'title?: string',
      'activeId?: string',
    ],
    usage:
      'Use beside long reading pages. Pass activeId to control the highlight, otherwise it follows scroll.',
    accessibility: 'Rendered as a labelled nav with in-page links.',
    performance: 'Avoids per-scroll layout work.',
    code: `import { TableOfContents } from "@arsenal/ui";

export function Example() {
  return (
    <TableOfContents
      title="On this page"
      items={[
        { id: "setup", text: "Setup", level: 2 },
        { id: "tailwind", text: "Tailwind preset", level: 3 },
        { id: "usage", text: "Usage", level: 2 },
      ]}
    />
  );
}`,
  },
  {
    id: 'reading-progress',
    name: 'ReadingProgress',
    description: 'Thin progress bar that tracks scroll through an article.',
    category: 'navigation',
    importLine: 'import { ReadingProgress } from "@arsenal/ui";',
    props: ['target?: string (CSS selector)', 'className?: string'],
    usage:
      'Place near the top of long reading pages. Pass a selector to measure a specific article element.',
    accessibility: 'Decorative; reduced motion removes the smoothing.',
    performance: 'Updates a single element on scroll.',
    code: `import { ReadingProgress } from "@arsenal/ui";

export function Example() {
  return (
    <>
      <ReadingProgress target="#article" />
      <article id="article">Long form content</article>
    </>
  );
}`,
  },
  {
    id: 'seo',
    name: 'Seo',
    description: 'Client-side document title and meta tags, including Open Graph and canonical URL.',
    category: 'utilities',
    importLine: 'import { Seo } from "@arsenal/ui";',
    props: [
      'title: string',
      'description: string',
      'siteUrl: string',
      'siteName?: string',
      'path?: string',
      'noIndex?: boolean',
      'image?: string',
    ],
    usage: 'Use in client-rendered pages that cannot use a framework metadata API.',
    accessibility: 'Sets a descriptive document title for page announcements.',
    performance: 'Updates existing meta tags in place instead of duplicating them.',
    code: `import { Seo } from "@arsenal/ui";

export function Example() {
  return (
    <Seo
      title="Components"
      description="Browse the shared UI library."
      siteName="Arsenal"
      siteUrl="https://arsenal.example.com"
      path="/components"
    />
  );
}`,
  },
  {
    id: 'orbit-radar',
    name: 'OrbitRadar',
    description: 'Animated orbital radar that signals idle, running, or done.',
    category: 'motion',
    importLine: 'import { OrbitRadar } from "@arsenal/ui";',
    props: ['status: idle | running | done', 'children?: ReactNode', 'size?: number', 'label?: string'],
    usage: 'Use as a scan or analysis progress indicator with a centre slot for an icon or count.',
    accessibility: 'Status is conveyed through the label; motion stops under prefers-reduced-motion.',
    performance: 'Animation only runs while status is running.',
    code: `import { OrbitRadar } from "@arsenal/ui";

export function Example() {
  return (
    <OrbitRadar status="running" size={160} label="Scanning repositories">
      <span className="text-sm">42</span>
    </OrbitRadar>
  );
}`,
  },
  {
    id: "aurora-background",
    name: "AuroraBackground",
    description: "Four soft colour pools drifting slowly behind content: the calm cinematic backdrop.",
    category: 'effects',
    importLine: 'import { AuroraBackground } from "@arsenal/fx";',
    props: [
      "palette?: \"dark\" | \"light\" | \"auto\"",
      "violet?, cyan?, indigo?, amber?: ColorInput",
      "intensity?: number",
      "vignette?: boolean",
      "scrollParallax?: boolean",
    ],
    usage: "Use behind heroes and landing sections where you want atmosphere without busy motion.",
    accessibility: "Decorative and aria-hidden; keep all copy in regular HTML above it.",
    performance: "CSS-transformed blurred layers; static when motion is reduced.",
    code: `import { AuroraBackground } from "@arsenal/fx";

export function Example() {
  return (
    <section className="relative min-h-[420px] overflow-hidden">
      <AuroraBackground intensity={0.9} vignette />
      <h1 className="relative p-10 text-4xl font-semibold">Ship faster</h1>
    </section>
  );
}`,
  },
  {
    id: "cosmic-particle-background",
    name: "CosmicParticleBackground",
    description: "A diagonal band of layered stars that drifts, twinkles and parts around the pointer.",
    category: 'effects',
    importLine: 'import { CosmicParticleBackground } from "@arsenal/fx";',
    props: [
      "palette?: \"dark\" | \"light\" | \"auto\"",
      "violet?, blue?, amber?: ColorInput",
      "interactive?: boolean",
      "scrollParallax?: boolean",
      "seed?: number",
    ],
    usage: "Use as a full-bleed hero field for a night-sky, cinematic first screen.",
    accessibility: "Decorative and aria-hidden; keep all copy in regular HTML above it.",
    performance: "One canvas on a shared rAF loop; paused off-screen and frozen when the user prefers reduced motion.",
    code: `import { CosmicParticleBackground } from "@arsenal/fx";

export function Example() {
  return (
    <section className="relative min-h-[420px] overflow-hidden">
      <CosmicParticleBackground interactive />
      <h1 className="relative p-10 text-4xl font-semibold">Ship faster</h1>
    </section>
  );
}`,
  },
  {
    id: "galaxy-particle-canvas",
    name: "GalaxyParticleCanvas",
    description: "An oblique spiral galaxy whose stars drift along their arms and part around the pointer.",
    category: 'effects',
    importLine: 'import { GalaxyParticleCanvas } from "@arsenal/fx";',
    props: [
      "accent?: ColorInput",
      "ink?: ColorInput",
      "palette?: \"dark\" | \"light\" | \"auto\"",
      "interactive?: boolean",
      "minCount?, maxCount?: number",
    ],
    usage: "Use as a signature hero visual; additive glow in dark mode, graphite ink on light paper.",
    accessibility: "Decorative and aria-hidden; keep all copy in regular HTML above it.",
    performance: "One canvas on a shared rAF loop; paused off-screen and frozen when the user prefers reduced motion.",
    code: `import { GalaxyParticleCanvas } from "@arsenal/fx";

export function Example() {
  return (
    <section className="relative min-h-[420px] overflow-hidden">
      <GalaxyParticleCanvas interactive maxCount={1200} />
      <h1 className="relative p-10 text-4xl font-semibold">Ship faster</h1>
    </section>
  );
}`,
  },
  {
    id: "infinity-particle-canvas",
    name: "InfinityParticleCanvas",
    description: "A figure-eight of stars, warm on one lobe and cool on the other, that parts around the pointer.",
    category: 'effects',
    importLine: 'import { InfinityParticleCanvas } from "@arsenal/fx";',
    props: [
      "leftColor?, rightColor?: ColorInput",
      "palette?: \"dark\" | \"light\" | \"auto\"",
      "interactive?: boolean",
      "minCount?, maxCount?: number",
    ],
    usage: "Use for brand marks about balance or loops, such as sync, pipelines or continuous delivery.",
    accessibility: "Decorative and aria-hidden; keep all copy in regular HTML above it.",
    performance: "One canvas on a shared rAF loop; paused off-screen and frozen when the user prefers reduced motion.",
    code: `import { InfinityParticleCanvas } from "@arsenal/fx";

export function Example() {
  return (
    <section className="relative min-h-[420px] overflow-hidden">
      <InfinityParticleCanvas interactive />
      <h1 className="relative p-10 text-4xl font-semibold">Ship faster</h1>
    </section>
  );
}`,
  },
  {
    id: "interactive-particles",
    name: "InteractiveParticles",
    description: "A living constellation mesh in three depth layers: drifts up, parts on hover, gathers on hold.",
    category: 'effects',
    importLine: 'import { InteractiveParticles } from "@arsenal/fx";',
    props: [
      "intensity?: \"normal\" | \"intense\"",
      "cyan?, amber?, violet?, accent?, highlight?: ColorInput",
      "interactive?: boolean",
      "scrollParallax?: boolean",
      "seed?: number",
    ],
    usage: "Use where the visual should react to the visitor: hover to part the mesh, press and hold to gather it.",
    accessibility: "Decorative and aria-hidden; keep all copy in regular HTML above it.",
    performance: "One canvas on a shared rAF loop; paused off-screen and frozen when the user prefers reduced motion.",
    code: `import { InteractiveParticles } from "@arsenal/fx";

export function Example() {
  return (
    <section className="relative min-h-[420px] overflow-hidden">
      <InteractiveParticles interactive intensity="normal" />
      <h1 className="relative p-10 text-4xl font-semibold">Ship faster</h1>
    </section>
  );
}`,
  },
  {
    id: "morphing-sphere",
    name: "MorphingSphere",
    description: "A point cloud that morphs between sphere, torus, wave and other shapes; drag to rotate.",
    category: 'effects',
    importLine: 'import { MorphingSphere } from "@arsenal/fx";',
    props: [
      "shape?: MorphShape (controlled)",
      "defaultShape?: MorphShape",
      "showControls?: boolean",
      "colors?: ColorInput[]",
      "links?: boolean",
      "height?: number | string",
      "interactive?: boolean",
    ],
    usage: "Use as a centrepiece in a hero or product section; the built-in controls switch shapes.",
    accessibility: "Shape controls are real buttons with labels; the canvas itself is decorative.",
    performance: "One canvas on a shared rAF loop; paused off-screen and frozen when the user prefers reduced motion.",
    code: `import { MorphingSphere } from "@arsenal/fx";

export function Example() {
  return (
    <MorphingSphere showControls links height={380} />
  );
}`,
  },
  {
    id: "noise-texture",
    name: "NoiseTexture",
    description: "A film-grain overlay that takes the banding off flat gradients. Static, no JS work.",
    category: 'effects',
    importLine: 'import { NoiseTexture } from "@arsenal/fx";',
    props: [
      "opacity?: number",
      "frequency?: number",
      "tileSize?: number",
      "blendMode?: CSSProperties[\"mixBlendMode\"]",
    ],
    usage: "Layer over gradients and aurora backdrops to make them feel printed rather than digital.",
    accessibility: "Decorative and aria-hidden; keep all copy in regular HTML above it.",
    performance: "A tiled SVG data URL; no animation loop.",
    code: `import { NoiseTexture } from "@arsenal/fx";

export function Example() {
  return (
    <section className="relative min-h-[420px] overflow-hidden">
      <NoiseTexture opacity={0.06} />
      <h1 className="relative p-10 text-4xl font-semibold">Ship faster</h1>
    </section>
  );
}`,
  },
  {
    id: "particle-burst",
    name: "ParticleBurst",
    description: "A transparent overlay that throws sparks with gravity and soft wall bounces on demand.",
    category: 'effects',
    importLine: 'import { ParticleBurst } from "@arsenal/fx";',
    props: [
      "ref: ParticleBurstHandle (burst(at?, options?), clear())",
      "colors?: ColorInput[]",
      "burst?: BurstOptions",
      "seed?: number",
    ],
    usage: "Call ref.current.burst(event) from a click handler to celebrate a completed action.",
    accessibility: "Decorative and aria-hidden; skipped entirely with reduced motion, so never carry meaning in it alone.",
    performance: "Canvas only runs while sparks are alive.",
    code: `import { useRef } from "react";
import { ParticleBurst, type ParticleBurstHandle } from "@arsenal/fx";

export function Example() {
  const ref = useRef<ParticleBurstHandle>(null);
  return (
    <div className="relative">
      <ParticleBurst ref={ref} />
      <button onClick={(e) => ref.current?.burst(e)}>Complete</button>
    </div>
  );
}`,
  },
  {
    id: "weather-canvas",
    name: "WeatherCanvas",
    description: "Rain, snow, petals or leaves with wind, ripples and lightning, driven by a weather state.",
    category: 'effects',
    importLine: 'import { WeatherCanvas } from "@arsenal/fx";',
    props: [
      "weather?: WeatherState",
      "precip?: \"none\" | \"rain\" | \"snow\" | \"petals\" | \"leaves\"",
      "intensity?: number",
      "wind?: number",
      "lightning?: boolean",
      "ripples?: boolean",
    ],
    usage: "Use for ambient seasonal or live-weather scenes behind content.",
    accessibility: "Decorative and aria-hidden; keep all copy in regular HTML above it.",
    performance: "One canvas on a shared rAF loop; paused off-screen and frozen when the user prefers reduced motion.",
    code: `import { WeatherCanvas } from "@arsenal/fx";

export function Example() {
  return (
    <section className="relative min-h-[420px] overflow-hidden">
      <WeatherCanvas precip="rain" intensity={0.7} wind={0.3} ripples />
      <h1 className="relative p-10 text-4xl font-semibold">Ship faster</h1>
    </section>
  );
}`,
  },
  {
    id: "gravity-well",
    name: "GravityWell",
    description: "A black hole with a two-armed Keplerian accretion disk, rendered in WebGL with React Three Fiber.",
    category: 'effects',
    importLine: 'import { GravityWell } from "@arsenal/three";',
    props: [
      "particleCount?: number",
      "diskSpeed?: number",
      "colorTheme?: \"theme\" | \"indigo\" | \"amber\" | \"emerald\"",
      "autoColor?: boolean",
      "palette?: \"dark\" | \"light\" | \"auto\"",
    ],
    usage: "Use as a signature hero visual or a section centrepiece. Needs the optional three and @react-three/fiber peers.",
    accessibility: "Decorative and aria-hidden; keep all copy in regular HTML above it.",
    performance: "Orbits run in the vertex shader (no per-frame CPU work); renders on demand when off screen, in a background tab or with reduced motion.",
    code: `import { GravityWell } from "@arsenal/three";

export function Example() {
  return (
    <section className="relative h-[420px]">
      <GravityWell particleCount={2000} diskSpeed={1} />
    </section>
  );
}`,
  },
  {
    id: "anomaly-matrix",
    name: "AnomalyMatrix",
    description: "A noise-displaced wireframe sphere with a rim glow that breathes, in its own WebGL canvas (GodSphere mesh included).",
    category: 'effects',
    importLine: 'import { AnomalyMatrix, GodSphere } from "@arsenal/three";',
    props: [
      "speed?: number",
      "scale?: number",
      "charge?: number  // 0-1, eases between core and outer colour",
      "detail?: number",
      "colorTheme?: \"theme\" | \"indigo\" | \"amber\" | \"emerald\"",
      "autoColor?: boolean",
    ],
    usage: "Use as a hero centrepiece or drop <GodSphere> into your own R3F scene. Drive charge from scroll or state.",
    accessibility: "Decorative and aria-hidden; with reduced motion it renders one still frame.",
    performance: "Displacement runs on the GPU; lower detail for small cards. Paused off screen and in background tabs.",
    code: `import { AnomalyMatrix } from "@arsenal/three";

export function Example() {
  return (
    <section className="relative h-[420px]">
      <AnomalyMatrix speed={1} charge={0.3} />
    </section>
  );
}`,
  },
];

export const COMPONENT_CATEGORIES: { id: ComponentCategory; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'cards', label: 'Cards' },
  { id: 'dashboards', label: 'Dashboards' },
  { id: 'data-display', label: 'Data display' },
  { id: 'controls', label: 'Controls' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'typography', label: 'Typography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'backgrounds', label: 'Backgrounds' },
  { id: 'motion', label: 'Motion' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'effects', label: 'Cinematic effects' },
];
