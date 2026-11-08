'use client';

import { type CSSProperties, type PointerEvent, useState } from 'react';
import {
  Badge,
  BentoCard,
  DashboardCard,
  DisclosureSection,
  FeatureCard,
  FloatingNav,
  GlassCard,
  GradientBorder,
  GridBackground,
  NetworkBackground,
  OrbBackground,
  PrimaryButton,
  MetricCard,
  ScoreGauge,
  ScrollReveal,
  SegmentedControl,
  SecondaryButton,
  SectionHeader,
  StatePanel,
  ThemeToggle,
  TimelineCard,
  UI_SETUP_SNIPPET,
  cn,
  type ComponentCatalogEntry,
} from '@arsenal/ui';
import { CatalogPreview, hasCatalogPreview } from './catalog-previews';

type Difficulty = 'Foundational' | 'Intermediate' | 'Advanced' | 'Experimental';

export interface ShowroomMeta {
  category: string;
  tags: string[];
  difficulty: Difficulty;
  dependencies: string[];
  popularity: number;
  recentlyAdded?: boolean;
}

export interface PlaygroundSettings {
  density: 'calm' | 'standard' | 'dense';
  accent: 'ember' | 'cyan' | 'steel';
  animationSpeed: number;
  rounded: 'tight' | 'standard' | 'wide';
  shadow: boolean;
  interactionMode: 'calm' | 'reactive' | 'intense';
}

interface Blueprint {
  title: string;
  category: string;
  description: string;
  components: string[];
  pattern: 'dashboard' | 'landing' | 'login' | 'admin';
}

export interface ComponentCollection {
  title: string;
  description: string;
  components: string[];
  tone: string;
}

const showroomMeta: Record<string, ShowroomMeta> = {
  'aurora-background': {
    category: 'Backgrounds',
    tags: ['aurora', 'ambient', 'hero'],
    difficulty: 'Advanced',
    dependencies: ['@arsenal/fx'],
    popularity: 80,
    recentlyAdded: true,
  },
  'cosmic-particle-background': {
    category: 'Particles',
    tags: ['stars', 'pointer', 'hero'],
    difficulty: 'Advanced',
    dependencies: ['@arsenal/fx'],
    popularity: 80,
    recentlyAdded: true,
  },
  'galaxy-particle-canvas': {
    category: 'Particles',
    tags: ['galaxy', 'pointer', 'signature'],
    difficulty: 'Advanced',
    dependencies: ['@arsenal/fx'],
    popularity: 80,
    recentlyAdded: true,
  },
  'infinity-particle-canvas': {
    category: 'Particles',
    tags: ['infinity', 'pointer', 'brand'],
    difficulty: 'Advanced',
    dependencies: ['@arsenal/fx'],
    popularity: 80,
    recentlyAdded: true,
  },
  'interactive-particles': {
    category: 'Particles',
    tags: ['mesh', 'hover', 'hold'],
    difficulty: 'Advanced',
    dependencies: ['@arsenal/fx'],
    popularity: 80,
    recentlyAdded: true,
  },
  'morphing-sphere': {
    category: '3D',
    tags: ['point cloud', 'morph', 'drag'],
    difficulty: 'Advanced',
    dependencies: ['@arsenal/fx'],
    popularity: 80,
    recentlyAdded: true,
  },
  'noise-texture': {
    category: 'Backgrounds',
    tags: ['grain', 'texture', 'overlay'],
    difficulty: 'Advanced',
    dependencies: ['@arsenal/fx'],
    popularity: 80,
    recentlyAdded: true,
  },
  'particle-burst': {
    category: 'Particles',
    tags: ['sparks', 'celebrate', 'click'],
    difficulty: 'Advanced',
    dependencies: ['@arsenal/fx'],
    popularity: 80,
    recentlyAdded: true,
  },
  'weather-canvas': {
    category: 'Particles',
    tags: ['rain', 'snow', 'ambient'],
    difficulty: 'Advanced',
    dependencies: ['@arsenal/fx'],
    popularity: 80,
    recentlyAdded: true,
  },
  'vault-hero': {
    category: 'Layouts',
    tags: ['hero', 'particles', 'motion', 'landing'],
    difficulty: 'Advanced',
    dependencies: ['NetworkBackground', 'PrimaryButton'],
    popularity: 96,
    recentlyAdded: true,
  },
  'network-background': {
    category: 'Particles',
    tags: ['canvas', 'mouse', 'background', 'animation'],
    difficulty: 'Advanced',
    dependencies: ['Canvas API'],
    popularity: 98,
    recentlyAdded: true,
  },
  'glass-card': {
    category: 'Cards',
    tags: ['hover', 'glow', 'surface', 'motion'],
    difficulty: 'Foundational',
    dependencies: ['framer-motion'],
    popularity: 91,
  },
  'bento-card': {
    category: 'Cards',
    tags: ['grid', 'layout', 'marketing', 'dashboard'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 87,
  },
  'dashboard-card': {
    category: 'Dashboards',
    tags: ['metric', 'data', 'status', 'trend'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 89,
  },
  'feature-card': {
    category: 'Cards',
    tags: ['feature', 'badge', 'content', 'product'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 79,
  },
  'timeline-card': {
    category: 'Data Display',
    tags: ['timeline', 'progress', 'hover', 'roadmap'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 82,
  },
  'section-header': {
    category: 'Typography',
    tags: ['heading', 'layout', 'action', 'content'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 73,
  },
  'primary-button': {
    category: 'Buttons',
    tags: ['cta', 'magnetic', 'action', 'motion'],
    difficulty: 'Foundational',
    dependencies: ['@arsenal/motion'],
    popularity: 94,
  },
  'secondary-button': {
    category: 'Buttons',
    tags: ['outline', 'action', 'hover', 'motion'],
    difficulty: 'Foundational',
    dependencies: ['@arsenal/motion'],
    popularity: 88,
  },
  'command-palette': {
    category: 'Overlays',
    tags: ['keyboard', 'search', 'dialog', 'navigation'],
    difficulty: 'Advanced',
    dependencies: ['@radix-ui/react-dialog'],
    popularity: 93,
  },
  'orb-background': {
    category: 'Backgrounds',
    tags: ['gradient', 'glow', 'hero', 'ambient'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 84,
  },
  'grid-background': {
    category: 'Backgrounds',
    tags: ['grid', 'layout', 'engineering', 'css'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 81,
  },
  'scroll-reveal': {
    category: 'Animations',
    tags: ['scroll', 'observer', 'entrance', 'motion'],
    difficulty: 'Intermediate',
    dependencies: ['react-intersection-observer'],
    popularity: 86,
  },
  badge: {
    category: 'Feedback',
    tags: ['status', 'priority', 'variant', 'label'],
    difficulty: 'Foundational',
    dependencies: ['class-variance-authority'],
    popularity: 76,
  },
  cn: {
    category: 'Utilities',
    tags: ['classes', 'tailwind', 'merge', 'helper'],
    difficulty: 'Foundational',
    dependencies: ['clsx', 'tailwind-merge'],
    popularity: 90,
  },
  'animated-number': {
    category: 'Data Display',
    tags: ['number', 'count-up', 'metric', 'motion'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 82,
    recentlyAdded: true,
  },
  'delta-pill': {
    category: 'Data Display',
    tags: ['change', 'trend', 'metric', 'status'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 78,
    recentlyAdded: true,
  },
  sparkline: {
    category: 'Charts',
    tags: ['chart', 'trend', 'inline', 'data'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 86,
    recentlyAdded: true,
  },
  'score-ring': {
    category: 'Charts',
    tags: ['score', 'progress', 'ring', 'metric'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 83,
    recentlyAdded: true,
  },
  'semi-gauge': {
    category: 'Charts',
    tags: ['gauge', 'risk', 'progress', 'metric'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 77,
    recentlyAdded: true,
  },
  treemap: {
    category: 'Charts',
    tags: ['treemap', 'portfolio', 'distribution', 'data'],
    difficulty: 'Advanced',
    dependencies: [],
    popularity: 80,
    recentlyAdded: true,
  },
  'donut-chart': {
    category: 'Charts',
    tags: ['donut', 'allocation', 'legend', 'data'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 85,
    recentlyAdded: true,
  },
  'stacked-bar-chart': {
    category: 'Charts',
    tags: ['bar-chart', 'comparison', 'series', 'data'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 79,
    recentlyAdded: true,
  },
  'line-chart': {
    category: 'Charts',
    tags: ['line-chart', 'trend', 'time', 'data'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 88,
    recentlyAdded: true,
  },
  'distribution-bars': {
    category: 'Charts',
    tags: ['distribution', 'bars', 'buckets', 'data'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 75,
    recentlyAdded: true,
  },
  'time-series-chart': {
    category: 'Charts',
    tags: ['time-series', 'equity', 'area', 'data'],
    difficulty: 'Advanced',
    dependencies: [],
    popularity: 87,
    recentlyAdded: true,
  },
  'drawdown-chart': {
    category: 'Charts',
    tags: ['drawdown', 'risk', 'equity', 'data'],
    difficulty: 'Advanced',
    dependencies: [],
    popularity: 76,
    recentlyAdded: true,
  },
  'data-ridge-background': {
    category: 'Backgrounds',
    tags: ['data', 'terrain', 'background', 'visualization'],
    difficulty: 'Experimental',
    dependencies: [],
    popularity: 72,
    recentlyAdded: true,
  },
  'form-fields': {
    category: 'Forms',
    tags: ['input', 'select', 'search', 'validation'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 92,
    recentlyAdded: true,
  },
  card: {
    category: 'Cards',
    tags: ['status', 'pipeline', 'surface', 'action'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 89,
    recentlyAdded: true,
  },
  skeleton: {
    category: 'Loading',
    tags: ['skeleton', 'placeholder', 'loading', 'layout'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 81,
    recentlyAdded: true,
  },
  'error-state': {
    category: 'Feedback',
    tags: ['error', 'retry', 'recovery', 'feedback'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 84,
    recentlyAdded: true,
  },
  tabs: {
    category: 'Navigation',
    tags: ['tabs', 'navigation', 'sections', 'state'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 90,
    recentlyAdded: true,
  },
  'animated-tabs': {
    category: 'Navigation',
    tags: ['tabs', 'animation', 'range', 'navigation'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 82,
    recentlyAdded: true,
  },
  'filter-chip': {
    category: 'Forms',
    tags: ['filter', 'chip', 'selection', 'count'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 83,
    recentlyAdded: true,
  },
  'facet-filter-dropdown': {
    category: 'Forms',
    tags: ['filter', 'dropdown', 'facet', 'count'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 79,
    recentlyAdded: true,
  },
  'table-view': {
    category: 'Tables',
    tags: ['table', 'sorting', 'pagination', 'data'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 86,
    recentlyAdded: true,
  },
  'kpi-card': {
    category: 'Dashboards',
    tags: ['kpi', 'metric', 'insight', 'action'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 88,
    recentlyAdded: true,
  },
  'confirm-dialog': {
    category: 'Overlays',
    tags: ['dialog', 'confirmation', 'destructive', 'action'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 85,
    recentlyAdded: true,
  },
  'side-panel': {
    category: 'Overlays',
    tags: ['panel', 'details', 'navigation', 'overlay'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 81,
    recentlyAdded: true,
  },
  'side-by-side-diff': {
    category: 'Data Display',
    tags: ['diff', 'code', 'review', 'comparison'],
    difficulty: 'Advanced',
    dependencies: [],
    popularity: 84,
    recentlyAdded: true,
  },
  'asset-icon': {
    category: 'SVG',
    tags: ['icon', 'asset', 'svg', 'trend'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 73,
    recentlyAdded: true,
  },
  'initials-avatar': {
    category: 'Cards',
    tags: ['avatar', 'initials', 'identity', 'people'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 78,
    recentlyAdded: true,
  },
  'upload-zone': {
    category: 'Forms',
    tags: ['upload', 'file', 'dropzone', 'progress'],
    difficulty: 'Intermediate',
    dependencies: [],
    popularity: 82,
    recentlyAdded: true,
  },
  'flip-clock': {
    category: 'Data Display',
    tags: ['clock', 'time', 'animation', 'display'],
    difficulty: 'Experimental',
    dependencies: [],
    popularity: 70,
    recentlyAdded: true,
  },
  'table-of-contents': {
    category: 'Navigation',
    tags: ['contents', 'anchor', 'documentation', 'navigation'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 77,
    recentlyAdded: true,
  },
  'reading-progress': {
    category: 'Utilities',
    tags: ['reading', 'progress', 'scroll', 'indicator'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 75,
    recentlyAdded: true,
  },
  seo: {
    category: 'Utilities',
    tags: ['metadata', 'search', 'preview', 'utilities'],
    difficulty: 'Foundational',
    dependencies: [],
    popularity: 72,
    recentlyAdded: true,
  },
  'orbit-radar': {
    category: 'Charts',
    tags: ['radar', 'status', 'orbit', 'visualization'],
    difficulty: 'Experimental',
    dependencies: [],
    popularity: 74,
    recentlyAdded: true,
  },
};

export const defaultSettings: PlaygroundSettings = {
  density: 'standard',
  accent: 'ember',
  animationSpeed: 1,
  rounded: 'standard',
  shadow: true,
  interactionMode: 'reactive',
};

const blueprints: Blueprint[] = [
  {
    title: 'AI Operations Dashboard',
    category: 'Dashboard',
    description:
      'A dense command center for token savings, context health, retrieval quality, and release readiness.',
    components: ['DashboardCard', 'GlassCard', 'GridBackground', 'Badge'],
    pattern: 'dashboard',
  },
  {
    title: 'Developer Tools Landing Page',
    category: 'Landing Page',
    description:
      'A reactive hero, live metrics, feature cards, and a clear launch sequence for technical products.',
    components: ['NetworkBackground', 'PrimaryButton', 'BentoCard', 'FeatureCard'],
    pattern: 'landing',
  },
  {
    title: 'Secure Login Portal',
    category: 'Login',
    description:
      'A compact authentication shell with validation states, status feedback, and ambient background motion.',
    components: ['GlassCard', 'Badge', 'SecondaryButton', 'OrbBackground'],
    pattern: 'login',
  },
  {
    title: 'Admin Control Panel',
    category: 'Admin Panel',
    description:
      'Navigation, operational cards, timeline status, and command-style search arranged for repeated work.',
    components: ['FloatingNav', 'TimelineCard', 'CommandPalette', 'DashboardCard'],
    pattern: 'admin',
  },
];

export const collections: ComponentCollection[] = [
  {
    title: 'Glass UI',
    description: 'Frosted surfaces, glow, gradient frames, and ambient backgrounds.',
    components: ['GlassCard', 'GradientBorder', 'OrbBackground', 'Badge'],
    tone: 'polished interfaces',
  },
  {
    title: 'AI Dashboard',
    description: 'Metrics, context status, command search, retrieval progress, and token savings.',
    components: ['DashboardCard', 'CommandPalette', 'TimelineCard', 'NetworkBackground'],
    tone: 'agent operations',
  },
  {
    title: 'Finance',
    description:
      'Dense cards, trend indicators, status labels, and conservative presentation layers.',
    components: ['DashboardCard', 'Badge', 'GridBackground', 'SectionHeader'],
    tone: 'analytical workflows',
  },
  {
    title: 'Developer Tools',
    description:
      'Launch sequences, command surfaces, package cards, and responsive shell patterns.',
    components: ['BentoCard', 'FeatureCard', 'FloatingNav', 'PrimaryButton'],
    tone: 'technical products',
  },
  {
    title: 'Landing Pages',
    description: 'Reactive heroes, feature grids, animated reveals, and strong calls to action.',
    components: ['NetworkBackground', 'ScrollReveal', 'BentoCard', 'SecondaryButton'],
    tone: 'product storytelling',
  },
  {
    title: 'Chrome Extension UI',
    description: 'Compact panels, quick actions, badges, and lightweight settings surfaces.',
    components: ['GlassCard', 'Badge', 'SecondaryButton', 'ThemeToggle'],
    tone: 'small surfaces',
  },
  {
    title: 'Mobile',
    description:
      'Stacked cards, compact metrics, touch-friendly controls, and reduced-density layouts.',
    components: ['FeatureCard', 'DashboardCard', 'PrimaryButton', 'Badge'],
    tone: 'responsive systems',
  },
];

export function metaFor(entry: ComponentCatalogEntry): ShowroomMeta {
  return (
    showroomMeta[entry.id] ?? {
      category: entry.category,
      tags: [entry.category],
      difficulty: 'Foundational',
      dependencies: [],
      popularity: 60,
    }
  );
}

export function ComponentPreview({
  entry,
  settings,
  immersive = false,
}: {
  entry: ComponentCatalogEntry;
  settings: PlaygroundSettings;
  immersive?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [toastCount, setToastCount] = useState(2);
  const [query, setQuery] = useState('');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [previewView, setPreviewView] = useState<'cards' | 'table' | 'timeline'>('cards');
  const roundedClass =
    settings.rounded === 'tight'
      ? 'rounded-arsenal-sm'
      : settings.rounded === 'wide'
        ? 'rounded-arsenal-lg'
        : 'rounded-arsenal';
  const intensityClass =
    settings.interactionMode === 'intense'
      ? 'scale-[1.02]'
      : settings.interactionMode === 'calm'
        ? 'scale-100'
        : 'hover:scale-[1.01]';
  const previewStyle = {
    transitionDuration: `${Math.max(120, 420 / settings.animationSpeed)}ms`,
    transform: `perspective(900px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
  } satisfies CSSProperties;

  const updateTilt = (event: PointerEvent<HTMLElement>) => {
    if (entry.id !== 'glass-card' && entry.id !== 'feature-card') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -8;
    setTilt({ x, y });
  };

  switch (entry.id) {
    case 'vault-hero':
      return (
        <section
          className={cn(
            'relative min-h-[320px] w-full overflow-hidden border border-arsenal-border bg-arsenal-background p-6',
            roundedClass,
          )}
        >
          <NetworkBackground density={settings.density} accent={settings.accent} />
          <div className="relative z-10 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-arsenal-accent">
              Interactive hero
            </p>
            <h3 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Move through the mesh. The system answers.
            </h3>
            <p className="mt-4 text-sm leading-6 text-arsenal-secondary">
              Pointer movement perturbs the network while the call-to-action and typography stay
              readable.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryButton forge>Activate vault</PrimaryButton>
              <SecondaryButton>Inspect graph</SecondaryButton>
            </div>
          </div>
        </section>
      );
    case 'network-background':
      return (
        <section
          className={cn(
            'relative h-72 w-full overflow-hidden border border-arsenal-border bg-arsenal-background',
            roundedClass,
          )}
        >
          <NetworkBackground density={settings.density} accent={settings.accent} />
          <div className="relative z-10 flex h-full items-end p-5">
            <GlassCard className="max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-accent">
                Pointer field
              </p>
              <p className="mt-2 text-sm text-arsenal-secondary">
                Move the cursor through the canvas. Click to gather the nearby nodes.
              </p>
            </GlassCard>
          </div>
        </section>
      );
    case 'glass-card':
      return (
        <div
          onPointerMove={updateTilt}
          onPointerLeave={() => setTilt({ x: 0, y: 0 })}
          style={previewStyle}
        >
          <GlassCard
            glow={settings.shadow}
            className={cn('max-w-md transition-transform', intensityClass)}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-accent">
                  Live repository card
                </p>
                <h3 className="mt-2 text-xl font-semibold">Context compiler</h3>
              </div>
              <Badge variant="progress">active</Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-arsenal-secondary">
              Hover to tilt the surface and feel the card lift like a production dashboard module.
            </p>
          </GlassCard>
        </div>
      );
    case 'bento-card':
      return (
        <div className="grid w-full max-w-2xl gap-4 md:grid-cols-2">
          <BentoCard
            title="Retrieval"
            description="Graph-aware context selection."
            icon={<span aria-hidden>01</span>}
          />
          <BentoCard
            title="Policy"
            description="Rules applied before model context."
            icon={<span aria-hidden>02</span>}
          />
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-left"
          >
            <BentoCard
              span="2"
              title={expanded ? 'Expanded budget lane' : 'Budget engine'}
              description={
                expanded
                  ? 'Profiles, token caps, and cache reuse are visible in the open state.'
                  : 'Click to expand the lane.'
              }
            />
          </button>
        </div>
      );
    case 'feature-card':
      return (
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          onPointerMove={updateTilt}
          onPointerLeave={() => setTilt({ x: 0, y: 0 })}
          style={previewStyle}
          className="block w-full max-w-md text-left transition-transform"
        >
          <FeatureCard
            badge={flipped ? 'Details' : 'New'}
            title={flipped ? 'Adoption path' : 'Knowledge graph'}
            description={
              flipped
                ? 'Click again to return. This state would expose implementation choices in a real product.'
                : 'Click the card to flip the content and inspect the feature state.'
            }
          />
        </button>
      );
    case 'dashboard-card':
      return (
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <DashboardCard
            title="Tokens saved"
            value={expanded ? '58k' : '42%'}
            change="+12%"
            trend="up"
          />
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-left"
          >
            <DashboardCard
              title="Context"
              value={expanded ? 'Expanded' : '8.2k'}
              change="click tile"
              trend="neutral"
            />
          </button>
          <DashboardCard title="Cache" value="94%" change="live ready" trend="up" />
        </div>
      );
    case 'timeline-card':
      return (
        <div className="max-h-72 w-full max-w-xl overflow-y-auto pr-2">
          {['Scan', 'Summarize', 'Retrieve', 'Compile'].map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setExpanded(index % 2 === 0)}
              className="mb-3 block w-full text-left"
            >
              <TimelineCard
                year={`0${index + 1}`}
                title={expanded && index % 2 === 0 ? `${step} expanded` : step}
                description={
                  expanded && index % 2 === 0
                    ? 'Expanded milestone with additional context and progress detail.'
                    : 'Hover or click a milestone to inspect progress.'
                }
                active={index === 1 || (expanded && index % 2 === 0)}
              />
            </button>
          ))}
        </div>
      );
    case 'section-header':
      return (
        <SectionHeader
          align={expanded ? 'center' : 'left'}
          eyebrow="Interactive section"
          title={expanded ? 'Centered command surface' : 'Repository operating layer'}
          subtitle="Toggle the alignment to see how the header adapts inside a real layout."
          action={
            <PrimaryButton onClick={() => setExpanded((value) => !value)}>
              Toggle alignment
            </PrimaryButton>
          }
          className="mb-0"
        />
      );
    case 'primary-button':
      return (
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton forge onClick={() => setToastCount((value) => value + 1)}>
            Launch workflow
          </PrimaryButton>
          <span className="text-sm text-arsenal-muted">Clicked {toastCount - 2} times</span>
        </div>
      );
    case 'secondary-button':
      return (
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Collapse details' : 'Reveal details'}
          </SecondaryButton>
          {expanded ? <Badge variant="accent">details visible</Badge> : null}
        </div>
      );
    case 'command-palette':
      return (
        <div className="w-full max-w-xl rounded-arsenal border border-arsenal-border bg-arsenal-background/78 p-4">
          <label
            className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-muted"
            htmlFor="command-demo-search"
          >
            Command search
          </label>
          <input
            id="command-demo-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type deploy, graph, token, docs..."
            className="mt-3 w-full rounded-arsenal-sm border border-arsenal-border bg-arsenal-surface px-3 py-2 text-sm text-arsenal-primary outline-none focus:border-arsenal-accent"
          />
          <div className="mt-3 space-y-2">
            {[
              'Deploy verified artifact',
              'Open knowledge graph',
              'Estimate token savings',
              'Generate docs',
            ]
              .filter((item) => item.toLowerCase().includes(query.toLowerCase()))
              .map((item) => (
                <button
                  key={item}
                  type="button"
                  className="flex w-full items-center justify-between rounded-arsenal-sm border border-arsenal-border bg-arsenal-elevated/70 px-3 py-2 text-left text-sm text-arsenal-secondary transition hover:border-arsenal-accent hover:text-arsenal-primary"
                >
                  {item}
                  <kbd className="text-xs text-arsenal-muted">Enter</kbd>
                </button>
              ))}
          </div>
        </div>
      );
    case 'orb-background':
      return (
        <section
          className={cn(
            'relative h-64 w-full overflow-hidden border border-arsenal-border',
            roundedClass,
          )}
        >
          <OrbBackground className={expanded ? 'opacity-100' : 'opacity-70'} />
          <div className="relative z-10 flex h-full items-center justify-center p-6 text-center">
            <button type="button" onClick={() => setExpanded((value) => !value)}>
              <GlassCard className="max-w-sm">
                <p className="font-medium">Click to change glow intensity</p>
                <p className="mt-2 text-sm text-arsenal-secondary">
                  Ambient hero lighting stays CSS-only.
                </p>
              </GlassCard>
            </button>
          </div>
        </section>
      );
    case 'grid-background':
      return (
        <section
          className={cn(
            'relative h-56 w-full overflow-hidden border border-arsenal-border',
            roundedClass,
          )}
        >
          <GridBackground className={expanded ? 'opacity-60' : 'opacity-30'} />
          <div className="relative z-10 flex h-full items-center justify-center p-6">
            <SecondaryButton onClick={() => setExpanded((value) => !value)}>
              Toggle grid density
            </SecondaryButton>
          </div>
        </section>
      );
    case 'gradient-border':
      return (
        <GradientBorder
          className={cn('max-w-sm transition-transform', expanded ? 'scale-105' : 'scale-100')}
        >
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="w-full p-5 text-left"
          >
            <p className="text-sm font-medium text-arsenal-primary">Gradient-framed control</p>
            <p className="mt-2 text-sm text-arsenal-secondary">
              Click to animate the framed panel.
            </p>
          </button>
        </GradientBorder>
      );
    case 'scroll-reveal':
      return (
        <div className="h-64 w-full max-w-xl overflow-y-auto rounded-arsenal border border-arsenal-border bg-arsenal-background/60 p-5">
          <div className="h-28 text-sm text-arsenal-muted">
            Scroll down to replay the reveal surface.
          </div>
          <ScrollReveal>
            <GlassCard>
              <p className="font-medium">Revealed context block</p>
              <p className="mt-2 text-sm text-arsenal-secondary">
                IntersectionObserver triggers motion as this block enters the viewport.
              </p>
            </GlassCard>
          </ScrollReveal>
        </div>
      );
    case 'badge':
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="progress">in progress</Badge>
            <Badge variant="success">ready</Badge>
            <Badge variant="danger">blocked</Badge>
            <Badge variant="p1">priority</Badge>
          </div>
          <PrimaryButton onClick={() => setToastCount((value) => value + 1)}>
            Generate status
          </PrimaryButton>
          <p className="text-sm text-arsenal-muted">Generated {toastCount} live status chips.</p>
        </div>
      );
    case 'cn':
      return (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            'rounded-arsenal border p-4 text-left text-sm transition',
            expanded
              ? 'border-arsenal-accent bg-arsenal-accent/12 shadow-arsenal-glow'
              : 'border-arsenal-border bg-arsenal-surface',
          )}
        >
          cn() merged {expanded ? 'active utility classes' : 'inactive utility classes'}
        </button>
      );
    case 'floating-nav':
      return (
        <div className="relative h-20 w-full overflow-hidden rounded-arsenal border border-arsenal-border bg-arsenal-background">
          <FloatingNav className="!left-4 !top-3 !translate-x-0 scale-90" />
        </div>
      );
    case 'theme-toggle':
      return (
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-sm text-arsenal-secondary">Toggle the live theme state.</span>
        </div>
      );
    case 'metric-card':
      return (
        <MetricCard
          className="w-full max-w-sm"
          label="Requests processed"
          value="24.8k"
          description="Across the last seven days"
          trend={{ label: '+8.4%', direction: 'up', tone: 'success' }}
          tone="accent"
        />
      );
    case 'score-gauge':
      return (
        <ScoreGauge
          value={82}
          label="Coverage score"
          description="82 of 100 checks currently pass."
          tone="success"
        />
      );
    case 'segmented-control':
      return (
        <SegmentedControl
          label="Choose a view"
          options={[
            { value: 'cards', label: 'Cards' },
            { value: 'table', label: 'Table' },
            { value: 'timeline', label: 'Timeline' },
          ]}
          value={previewView}
          onValueChange={setPreviewView}
        />
      );
    case 'disclosure-section':
      return (
        <DisclosureSection
          className="w-full max-w-2xl"
          title="Implementation details"
          summary="Configuration, limits, and operational notes"
          meta="3 items"
          defaultOpen
        >
          <p className="text-sm leading-relaxed">
            Dense content stays available without overwhelming the surrounding page.
          </p>
        </DisclosureSection>
      );
    case 'state-panel':
      return (
        <div className="grid w-full gap-3 lg:grid-cols-3">
          <StatePanel
            kind="empty"
            size="compact"
            title="Nothing here yet"
            description="Create the first item."
          />
          <StatePanel
            kind="loading"
            size="compact"
            title="Loading data"
            description="This should only take a moment."
          />
          <StatePanel
            kind="error"
            size="compact"
            title="Unable to load"
            description="Try the request again."
          />
        </div>
      );
    default:
      if (hasCatalogPreview(entry.id)) return <CatalogPreview id={entry.id} />;
      return immersive ? <GlassCard>{entry.name}</GlassCard> : null;
  }
}

export function copyBundleFor(entry: ComponentCatalogEntry) {
  return [
    `// ${entry.name}`,
    entry.importLine,
    '',
    entry.code,
    '',
    '// Required setup',
    UI_SETUP_SNIPPET,
  ].join('\n');
}

export function PlaygroundPanel({
  entry,
  settings,
  onChange,
  onClose,
}: {
  entry: ComponentCatalogEntry;
  settings: PlaygroundSettings;
  onChange: (settings: PlaygroundSettings) => void;
  onClose: () => void;
}) {
  return (
    <aside className="sticky top-28 rounded-arsenal-lg border border-arsenal-border bg-arsenal-background/88 p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-accent">
            Playground
          </p>
          <h3 className="mt-1 font-semibold">{entry.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-arsenal-border px-3 py-1 text-xs text-arsenal-muted"
        >
          Close
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <label className="block text-sm text-arsenal-secondary">
          Density
          <select
            value={settings.density}
            onChange={(event) =>
              onChange({
                ...settings,
                density: event.target.value as PlaygroundSettings['density'],
              })
            }
            className="mt-2 w-full rounded-arsenal-sm border border-arsenal-border bg-arsenal-surface px-3 py-2 text-arsenal-primary"
          >
            <option value="calm">calm</option>
            <option value="standard">standard</option>
            <option value="dense">dense</option>
          </select>
        </label>
        <label className="block text-sm text-arsenal-secondary">
          Accent
          <select
            value={settings.accent}
            onChange={(event) =>
              onChange({ ...settings, accent: event.target.value as PlaygroundSettings['accent'] })
            }
            className="mt-2 w-full rounded-arsenal-sm border border-arsenal-border bg-arsenal-surface px-3 py-2 text-arsenal-primary"
          >
            <option value="ember">ember</option>
            <option value="cyan">cyan</option>
            <option value="steel">steel</option>
          </select>
        </label>
        <label className="block text-sm text-arsenal-secondary">
          Animation speed: {settings.animationSpeed.toFixed(1)}x
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.animationSpeed}
            onChange={(event) =>
              onChange({ ...settings, animationSpeed: Number(event.target.value) })
            }
            className="mt-2 w-full"
          />
        </label>
        <label className="block text-sm text-arsenal-secondary">
          Rounded
          <select
            value={settings.rounded}
            onChange={(event) =>
              onChange({
                ...settings,
                rounded: event.target.value as PlaygroundSettings['rounded'],
              })
            }
            className="mt-2 w-full rounded-arsenal-sm border border-arsenal-border bg-arsenal-surface px-3 py-2 text-arsenal-primary"
          >
            <option value="tight">tight</option>
            <option value="standard">standard</option>
            <option value="wide">wide</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 rounded-arsenal-sm border border-arsenal-border bg-arsenal-surface/70 px-3 py-2 text-sm text-arsenal-secondary">
          Shadow
          <input
            type="checkbox"
            checked={settings.shadow}
            onChange={(event) => onChange({ ...settings, shadow: event.target.checked })}
          />
        </label>
        <label className="block text-sm text-arsenal-secondary">
          Interaction mode
          <select
            value={settings.interactionMode}
            onChange={(event) =>
              onChange({
                ...settings,
                interactionMode: event.target.value as PlaygroundSettings['interactionMode'],
              })
            }
            className="mt-2 w-full rounded-arsenal-sm border border-arsenal-border bg-arsenal-surface px-3 py-2 text-arsenal-primary"
          >
            <option value="calm">calm</option>
            <option value="reactive">reactive</option>
            <option value="intense">intense</option>
          </select>
        </label>
      </div>
    </aside>
  );
}

function BlueprintPreview({ blueprint }: { blueprint: Blueprint }) {
  if (blueprint.pattern === 'landing') {
    return (
      <div className="relative min-h-[28rem] overflow-hidden rounded-arsenal-lg border border-arsenal-border bg-arsenal-background p-6">
        <NetworkBackground density="standard" accent="ember" />
        <div className="relative z-10 grid h-full gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Badge variant="accent">{blueprint.category}</Badge>
            <h3 className="mt-4 text-4xl font-semibold tracking-tight">
              Launch a developer product with a living interface.
            </h3>
            <p className="mt-4 text-sm leading-6 text-arsenal-secondary">
              Reactive hero, bento grid, feature cards, and action hierarchy composed into one
              production-facing page.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryButton forge>Start build</PrimaryButton>
              <SecondaryButton>Browse modules</SecondaryButton>
            </div>
          </div>
          <div className="grid gap-3">
            <BentoCard title="Rules" description="AI guardrails shipped with the repo." />
            <BentoCard title="Context" description="Knowledge graph and token budget ready." />
            <FeatureCard
              badge="Live"
              title="Launch sequence"
              description="Blueprint, gates, docs, dashboard, and deploy workflow."
            />
          </div>
        </div>
      </div>
    );
  }

  if (blueprint.pattern === 'login') {
    return (
      <div className="relative min-h-[28rem] overflow-hidden rounded-arsenal-lg border border-arsenal-border bg-arsenal-background p-6">
        <OrbBackground />
        <div className="relative z-10 mx-auto flex min-h-[24rem] max-w-md items-center">
          <GlassCard className="w-full">
            <Badge variant="success">secure workspace</Badge>
            <h3 className="mt-4 text-2xl font-semibold">Sign in to Arsenal Cloud</h3>
            <div className="mt-5 space-y-3">
              <input
                value="builder@oblivionlabs.dev"
                readOnly
                className="w-full rounded-arsenal-sm border border-arsenal-border bg-arsenal-background px-3 py-2 text-sm text-arsenal-primary"
              />
              <input
                value="validated-passkey"
                readOnly
                type="password"
                className="w-full rounded-arsenal-sm border border-arsenal-accent bg-arsenal-background px-3 py-2 text-sm text-arsenal-primary"
              />
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <Badge variant="progress">passkey ready</Badge>
              <PrimaryButton forge>Enter vault</PrimaryButton>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (blueprint.pattern === 'admin') {
    return (
      <div className="relative min-h-[28rem] overflow-hidden rounded-arsenal-lg border border-arsenal-border bg-arsenal-background p-5">
        <GridBackground className="opacity-20" />
        <div className="relative z-10 grid gap-4 lg:grid-cols-[16rem_1fr]">
          <div className="rounded-arsenal border border-arsenal-border bg-arsenal-surface/76 p-3">
            <FloatingNav className="!static !translate-x-0" />
            <div className="mt-6 space-y-2 text-sm text-arsenal-secondary">
              {['Overview', 'Workflows', 'Automations', 'Settings'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="w-full rounded-arsenal-sm border border-arsenal-border bg-arsenal-background/60 px-3 py-2 text-left transition hover:border-arsenal-accent"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <DashboardCard title="Pipelines" value="18" change="+4 ready" trend="up" />
              <DashboardCard title="Incidents" value="0" change="stable" trend="neutral" />
              <DashboardCard title="Coverage" value="96%" change="+2%" trend="up" />
            </div>
            <TimelineCard
              year="Now"
              title="Release readiness"
              description="Lint, test, build, security, accessibility, and performance checks are aligned."
              active
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[28rem] overflow-hidden rounded-arsenal-lg border border-arsenal-border bg-arsenal-background p-5">
      <GridBackground className="opacity-25" />
      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            align="left"
            eyebrow="AI command center"
            title="Repository intelligence"
            subtitle="A complete dashboard assembled from Arsenal primitives."
            className="mb-0"
          />
          <PrimaryButton forge>Run analysis</PrimaryButton>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <DashboardCard title="Token savings" value="91%" change="+8%" trend="up" />
          <DashboardCard title="Graph nodes" value="1.8k" change="+240" trend="up" />
          <DashboardCard title="Risk" value="Low" change="stable" trend="neutral" />
          <DashboardCard title="Cache" value="94%" change="hot" trend="up" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-accent">
              Retrieval lanes
            </p>
            <div className="mt-4 grid gap-3">
              {['Rules', 'Source summaries', 'Tests', 'Docs'].map((item) => (
                <div
                  key={item}
                  className="rounded-arsenal-sm border border-arsenal-border bg-arsenal-background/70 p-3 text-sm text-arsenal-secondary"
                >
                  {item}
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard>
            <TimelineCard
              year="01"
              title="Compile task context"
              description="Graph neighbors and cached summaries are selected before the prompt is built."
              active
            />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

export function BlueprintGallery() {
  return (
    <div className="space-y-6">
      <div className="rounded-arsenal-lg border border-arsenal-border bg-arsenal-surface/40 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-arsenal-accent">
          Blueprint studio
        </p>
        <h3 className="mt-2 text-2xl font-semibold">
          Components composed into complete interfaces.
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-arsenal-secondary">
          These are not templates to read. They are working interface blueprints showing how Arsenal
          pieces combine into dashboards, landing pages, login flows, and admin panels.
        </p>
      </div>

      {blueprints.map((blueprint) => (
        <article key={blueprint.title} className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-muted">
                {blueprint.category}
              </p>
              <h3 className="mt-1 text-xl font-semibold">{blueprint.title}</h3>
              <p className="mt-2 max-w-3xl text-sm text-arsenal-secondary">
                {blueprint.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {blueprint.components.map((component) => (
                <Badge key={component} variant="default">
                  {component}
                </Badge>
              ))}
            </div>
          </div>
          <BlueprintPreview blueprint={blueprint} />
        </article>
      ))}
    </div>
  );
}
