'use client';

import { type CSSProperties, type PointerEvent, useMemo, useState } from 'react';
import {
  Badge,
  BentoCard,
  CommandPalette,
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
  UI_COMPONENT_CATALOG,
  UI_SETUP_SNIPPET,
  cn,
  type ComponentCatalogEntry,
} from '@arsenal/ui';

type ViewMode = 'gallery' | 'playground' | 'blueprint' | 'collections';
type Difficulty = 'Foundational' | 'Intermediate' | 'Advanced' | 'Experimental';

interface ShowroomMeta {
  category: string;
  tags: string[];
  difficulty: Difficulty;
  dependencies: string[];
  popularity: number;
  recentlyAdded?: boolean;
}

interface PlaygroundSettings {
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

interface ComponentCollection {
  title: string;
  description: string;
  components: string[];
  tone: string;
}

const requestedCategories = [
  'Backgrounds',
  'Navigation',
  'Cards',
  'Buttons',
  'Forms',
  'Data Display',
  'Charts',
  'Tables',
  'Typography',
  'Overlays',
  'Animations',
  'Loading',
  'Feedback',
  'Layouts',
  'Dashboards',
  '3D',
  'SVG',
  'React Flow',
  'Particles',
  'Utilities',
  'Experimental',
];

const showroomMeta: Record<string, ShowroomMeta> = {
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
};

const defaultSettings: PlaygroundSettings = {
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

const collections: ComponentCollection[] = [
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

function metaFor(entry: ComponentCatalogEntry): ShowroomMeta {
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

function ComponentPreview({
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
          <StatePanel kind="empty" size="compact" title="Nothing here yet" description="Create the first item." />
          <StatePanel kind="loading" size="compact" title="Loading data" description="This should only take a moment." />
          <StatePanel kind="error" size="compact" title="Unable to load" description="Try the request again." />
        </div>
      );
    default:
      return immersive ? <GlassCard>{entry.name}</GlassCard> : null;
  }
}

function copyBundleFor(entry: ComponentCatalogEntry) {
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

function stageClassFor(entry: ComponentCatalogEntry) {
  const meta = metaFor(entry);

  if (meta.category === 'Particles' || meta.category === 'Backgrounds') {
    return 'bg-[radial-gradient(circle_at_30%_18%,rgba(56,189,248,0.14),transparent_34%),linear-gradient(135deg,rgba(8,13,18,0.96),rgba(2,6,10,0.92))]';
  }

  if (meta.category === 'Dashboards' || meta.category === 'Data Display') {
    return 'bg-[linear-gradient(135deg,rgba(8,13,18,0.96),rgba(15,23,42,0.92))]';
  }

  if (meta.category === 'Buttons' || meta.category === 'Feedback') {
    return 'bg-[radial-gradient(circle_at_50%_10%,rgba(148,163,184,0.18),transparent_32%),linear-gradient(135deg,rgba(17,24,39,0.94),rgba(3,7,18,0.92))]';
  }

  if (meta.category === 'Typography' || meta.category === 'Layouts') {
    return 'bg-[linear-gradient(135deg,rgba(12,10,9,0.95),rgba(28,25,23,0.88))]';
  }

  return 'bg-[linear-gradient(135deg,rgba(9,9,11,0.96),rgba(24,24,27,0.88))]';
}

function ShowroomCard({
  entry,
  isFavorite,
  copied,
  settings,
  onCopy,
  onFavorite,
  onFullscreen,
  onPlayground,
}: {
  entry: ComponentCatalogEntry;
  isFavorite: boolean;
  copied: boolean;
  settings: PlaygroundSettings;
  onCopy: () => void;
  onFavorite: () => void;
  onFullscreen: () => void;
  onPlayground: () => void;
}) {
  const meta = metaFor(entry);

  return (
    <article
      id={entry.id}
      className="group scroll-mt-24 overflow-hidden rounded-arsenal-lg border border-arsenal-border bg-zinc-950/36 backdrop-blur-xl transition duration-300 hover:border-zinc-500/70"
    >
      <div
        className={cn(
          'relative min-h-[22rem] overflow-hidden border-b border-arsenal-border p-4',
          stageClassFor(entry),
        )}
      >
        <div className="absolute right-3 top-3 z-20 flex gap-2">
          <button
            type="button"
            onClick={onFavorite}
            className="rounded-full border border-white/12 bg-black/42 px-3 py-1 text-xs text-zinc-300 backdrop-blur transition hover:border-white/35 hover:text-white"
          >
            {isFavorite ? 'Favorited' : 'Favorite'}
          </button>
          <button
            type="button"
            onClick={onFullscreen}
            className="rounded-full border border-white/12 bg-black/42 px-3 py-1 text-xs text-zinc-300 backdrop-blur transition hover:border-white/35 hover:text-white"
          >
            Fullscreen
          </button>
        </div>
        <div className="flex min-h-[20rem] items-center justify-center pt-10">
          <ComponentPreview entry={entry} settings={settings} />
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-muted">
              {meta.category}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{entry.name}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-arsenal-secondary">
              {entry.description}
            </p>
          </div>
          <Badge
            variant={
              meta.difficulty === 'Advanced' || meta.difficulty === 'Experimental'
                ? 'warning'
                : 'default'
            }
          >
            {meta.difficulty}
          </Badge>
        </div>

        <div className="grid gap-3 text-xs md:grid-cols-2">
          <div>
            <p className="font-semibold uppercase tracking-[0.18em] text-arsenal-muted">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-arsenal-border bg-arsenal-background/70 px-2.5 py-1 text-arsenal-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-[0.18em] text-arsenal-muted">
              Dependencies
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(meta.dependencies.length ? meta.dependencies : ['none']).map((dependency) => (
                <span
                  key={dependency}
                  className="rounded-full border border-arsenal-border bg-arsenal-background/70 px-2.5 py-1 text-arsenal-muted"
                >
                  {dependency}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-semibold transition',
              copied
                ? 'border-emerald-400/40 bg-emerald-400/12 text-emerald-200'
                : 'border-zinc-500/40 bg-zinc-100 text-zinc-950 hover:bg-white',
            )}
          >
            {copied ? 'Copied bundle' : 'Copy Component'}
          </button>
          <button
            type="button"
            onClick={onFullscreen}
            className="rounded-full border border-arsenal-border bg-arsenal-elevated px-4 py-2 text-sm text-arsenal-secondary transition hover:border-zinc-500 hover:text-arsenal-primary"
          >
            View Full Demo
          </button>
          <button
            type="button"
            onClick={onPlayground}
            className="rounded-full border border-arsenal-border bg-arsenal-elevated px-4 py-2 text-sm text-arsenal-secondary transition hover:border-zinc-500 hover:text-arsenal-primary"
          >
            Open Playground
          </button>
        </div>
      </div>
    </article>
  );
}

function PlaygroundPanel({
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

function BlueprintGallery() {
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

function CollectionsGallery({
  entries,
  settings,
  favorites,
  copiedId,
  onCopy,
  onFavorite,
  onFullscreen,
  onPlayground,
}: {
  entries: ComponentCatalogEntry[];
  settings: PlaygroundSettings;
  favorites: string[];
  copiedId: string | null;
  onCopy: (entry: ComponentCatalogEntry) => void;
  onFavorite: (entryId: string) => void;
  onFullscreen: (entry: ComponentCatalogEntry) => void;
  onPlayground: (entry: ComponentCatalogEntry) => void;
}) {
  const entryByName = new Map(entries.map((entry) => [entry.name, entry]));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {collections.map((collection) => {
        const collectionEntries = collection.components
          .map((component) => entryByName.get(component))
          .filter((entry): entry is ComponentCatalogEntry => Boolean(entry));

        return (
          <article
            key={collection.title}
            className="overflow-hidden rounded-arsenal-lg border border-arsenal-border bg-arsenal-surface/42"
          >
            <div className="relative overflow-hidden border-b border-arsenal-border bg-arsenal-background/72 p-5">
              <NetworkBackground density="calm" accent="steel" className="opacity-35" />
              <div className="relative z-10">
                <Badge variant="accent">{collection.tone}</Badge>
                <h3 className="mt-3 text-2xl font-semibold">{collection.title}</h3>
                <p className="mt-2 text-sm leading-6 text-arsenal-secondary">
                  {collection.description}
                </p>
              </div>
            </div>
            <div className="grid gap-4 p-4">
              {collectionEntries.map((entry) => (
                <ShowroomCard
                  key={entry.id}
                  entry={entry}
                  settings={settings}
                  copied={copiedId === entry.id}
                  isFavorite={favorites.includes(entry.id)}
                  onCopy={() => onCopy(entry)}
                  onFavorite={() => onFavorite(entry.id)}
                  onFullscreen={() => onFullscreen(entry)}
                  onPlayground={() => onPlayground(entry)}
                />
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function UiComponentShowcase() {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fullscreenEntry, setFullscreenEntry] = useState<ComponentCatalogEntry | null>(null);
  const [playgroundEntry, setPlaygroundEntry] = useState<ComponentCatalogEntry | null>(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [immersiveFullscreen, setImmersiveFullscreen] = useState(false);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return UI_COMPONENT_CATALOG.filter((entry) => {
      const meta = metaFor(entry);
      const matchesCategory = category === 'All' || meta.category === category;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          entry.name,
          entry.description,
          meta.category,
          meta.difficulty,
          ...meta.tags,
          ...meta.dependencies,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    }).sort((a, b) => metaFor(b).popularity - metaFor(a).popularity);
  }, [category, query]);

  const activePlaygroundEntry = playgroundEntry ?? filtered[0] ?? UI_COMPONENT_CATALOG[0];

  const copyComponent = async (entry: ComponentCatalogEntry) => {
    await navigator.clipboard.writeText(copyBundleFor(entry));
    setCopiedId(entry.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleFavorite = (entryId: string) => {
    setFavorites((current) =>
      current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId],
    );
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-arsenal-lg border border-arsenal-border bg-arsenal-background/72 p-6 md:p-8">
        <NetworkBackground density="calm" accent="portfolio" className="opacity-60" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-arsenal-accent">
              Component gallery
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
              Build full interfaces from living components.
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-arsenal-secondary">
              Move between Gallery, Playground, Blueprint, and Collections. Arsenal is not only a
              place to copy UI primitives; it is a source of inspiration for complete product
              surfaces.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <DashboardCard
              title="Live exhibits"
              value={String(UI_COMPONENT_CATALOG.length)}
              change="actual components"
              trend="up"
            />
            <DashboardCard
              title="Favorites"
              value={String(favorites.length)}
              change="local session"
              trend="neutral"
            />
            <DashboardCard
              title="Studio"
              value={viewMode}
              change="switch anytime"
              trend="neutral"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-arsenal-lg border border-arsenal-border bg-arsenal-surface/38 p-4 lg:grid-cols-[1fr_auto]">
        <div>
          <label
            htmlFor="component-search"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-muted"
          >
            Search by category, animation, technology, accessibility, performance, popularity
          </label>
          <input
            id="component-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try particles, motion, canvas, keyboard, dashboard, recently added..."
            className="mt-2 w-full rounded-arsenal border border-arsenal-border bg-arsenal-background px-4 py-3 text-sm text-arsenal-primary outline-none transition focus:border-zinc-400"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {(['gallery', 'playground', 'blueprint', 'collections'] satisfies ViewMode[]).map(
            (mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'rounded-full border px-3 py-2 text-xs font-medium capitalize transition',
                  viewMode === mode
                    ? 'border-white/35 bg-white/10 text-white'
                    : 'border-arsenal-border bg-arsenal-elevated text-arsenal-secondary hover:border-zinc-500 hover:text-arsenal-primary',
                )}
              >
                {mode}
              </button>
            ),
          )}
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-1">
        {['All', ...requestedCategories].map((item) => {
          const count =
            item === 'All'
              ? UI_COMPONENT_CATALOG.length
              : UI_COMPONENT_CATALOG.filter((entry) => metaFor(entry).category === item).length;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-2 text-xs transition',
                category === item
                  ? 'border-white/35 bg-white/10 text-white'
                  : 'border-arsenal-border bg-arsenal-surface/62 text-arsenal-muted hover:border-zinc-500 hover:text-arsenal-primary',
              )}
            >
              {item} <span className="text-arsenal-muted">{count}</span>
            </button>
          );
        })}
      </section>

      {viewMode === 'gallery' ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {filtered.map((entry) => (
            <ShowroomCard
              key={entry.id}
              entry={entry}
              settings={settings}
              copied={copiedId === entry.id}
              isFavorite={favorites.includes(entry.id)}
              onCopy={() => void copyComponent(entry)}
              onFavorite={() => toggleFavorite(entry.id)}
              onFullscreen={() => setFullscreenEntry(entry)}
              onPlayground={() => {
                setPlaygroundEntry(entry);
                setViewMode('playground');
              }}
            />
          ))}

          {filtered.length === 0 ? (
            <GlassCard className="xl:col-span-2">
              <p className="text-lg font-semibold">No live exhibits match that filter yet.</p>
              <p className="mt-2 text-sm text-arsenal-secondary">
                Clear the search or choose another category. Empty roadmap categories stay visible
                so future components have a place to land.
              </p>
            </GlassCard>
          ) : null}
        </section>
      ) : null}

      {viewMode === 'playground' ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <GlassCard className="arsenal-panel">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-arsenal-accent">
                    Visual prop lab
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">{activePlaygroundEntry.name}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-arsenal-secondary">
                    Tweak the controls and watch the live component update instantly. Pick another
                    component from the strip below.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyComponent(activePlaygroundEntry)}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm font-semibold transition',
                      copiedId === activePlaygroundEntry.id
                        ? 'border-emerald-400/40 bg-emerald-400/12 text-emerald-200'
                        : 'border-zinc-500/40 bg-zinc-100 text-zinc-950 hover:bg-white',
                    )}
                  >
                    {copiedId === activePlaygroundEntry.id ? 'Copied bundle' : 'Copy Component'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenEntry(activePlaygroundEntry)}
                    className="rounded-full border border-arsenal-border px-4 py-2 text-sm text-arsenal-secondary"
                  >
                    Fullscreen
                  </button>
                </div>
              </div>
            </GlassCard>

            <div className="relative min-h-[34rem] overflow-hidden rounded-arsenal-lg border border-arsenal-border bg-arsenal-background/74 p-6">
              <GridBackground className="opacity-20" />
              <div className="relative z-10 flex min-h-[30rem] items-center justify-center">
                <ComponentPreview entry={activePlaygroundEntry} settings={settings} immersive />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {filtered.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setPlaygroundEntry(entry)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-2 text-xs transition',
                    activePlaygroundEntry.id === entry.id
                      ? 'border-white/35 bg-white/10 text-white'
                      : 'border-arsenal-border bg-arsenal-surface/70 text-arsenal-muted hover:border-zinc-500',
                  )}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          </div>

          <PlaygroundPanel
            entry={activePlaygroundEntry}
            settings={settings}
            onChange={setSettings}
            onClose={() => setViewMode('gallery')}
          />
        </section>
      ) : null}

      {viewMode === 'blueprint' ? <BlueprintGallery /> : null}

      {viewMode === 'collections' ? (
        <CollectionsGallery
          entries={UI_COMPONENT_CATALOG}
          settings={settings}
          favorites={favorites}
          copiedId={copiedId}
          onCopy={(entry) => void copyComponent(entry)}
          onFavorite={toggleFavorite}
          onFullscreen={setFullscreenEntry}
          onPlayground={(entry) => {
            setPlaygroundEntry(entry);
            setViewMode('playground');
          }}
        />
      ) : null}

      {fullscreenEntry ? (
        <div
          className={cn(
            'fixed inset-0 z-50 transition-all duration-300',
            immersiveFullscreen ? 'bg-black/98 p-0' : 'bg-black/90 p-4 backdrop-blur-xl md:p-8',
          )}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={cn(
              'flex h-full flex-col overflow-hidden transition-all duration-300',
              immersiveFullscreen
                ? 'rounded-none border-none bg-black'
                : 'rounded-arsenal-lg border border-arsenal-border bg-arsenal-background',
            )}
          >
            {/* Header controls */}
            <div
              className={cn(
                'flex items-center justify-between gap-4 border-b border-arsenal-border p-4 transition-all duration-300',
                immersiveFullscreen && 'hidden',
              )}
            >
              <div>
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-arsenal-accent">
                  Fullscreen Demo
                </p>
                <h3 className="text-lg font-extrabold tracking-tight mt-0.5">
                  {fullscreenEntry.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImmersiveFullscreen(true)}
                  className="rounded-full border border-arsenal-border bg-arsenal-elevated/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-arsenal-secondary transition hover:border-arsenal-accent hover:text-arsenal-primary"
                >
                  Immersive View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFullscreenEntry(null);
                    setImmersiveFullscreen(false);
                  }}
                  className="rounded-full border border-arsenal-border bg-arsenal-elevated/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-arsenal-secondary transition hover:border-red-500/50 hover:text-red-400"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Immersive View Floating Controls */}
            {immersiveFullscreen && (
              <div className="absolute right-6 top-6 z-50 flex items-center gap-2 rounded-full border border-arsenal-border bg-black/60 p-1.5 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setImmersiveFullscreen(false)}
                  className="rounded-full bg-white/10 px-3.5 py-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-white hover:bg-white/20 transition"
                >
                  Exit Immersive
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFullscreenEntry(null);
                    setImmersiveFullscreen(false);
                  }}
                  className="rounded-full bg-red-600 px-3.5 py-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-white hover:bg-red-700 transition"
                >
                  Close
                </button>
              </div>
            )}

            <div
              className={cn(
                'flex min-h-0 flex-1 items-center justify-center overflow-auto',
                immersiveFullscreen ? 'p-0' : 'p-6',
              )}
            >
              <ComponentPreview entry={fullscreenEntry} settings={settings} immersive />
            </div>
          </div>
        </div>
      ) : null}

      <CommandPalette />
    </div>
  );
}
