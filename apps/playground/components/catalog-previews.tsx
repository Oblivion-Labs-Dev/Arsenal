'use client';

import { type ReactNode, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { HERO_PLATE_PIECES, type HeroPlatePieceId } from '@arsenal/scene';
import {
  AuroraBackground,
  CosmicParticleBackground,
  GalaxyParticleCanvas,
  InfinityParticleCanvas,
  InteractiveParticles,
  MorphingSphere,
  NoiseTexture,
  ParticleBurst,
  type ParticleBurstHandle,
  useArsenalTheme,
  WeatherCanvas,
} from '@arsenal/fx';
import {
  AnimatedNumber,
  AnimatedTabs,
  AssetIcon,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ConfirmDialog,
  DataRidgeBackground,
  DeltaPill,
  DistributionBars,
  DonutChart,
  DrawdownChart,
  ErrorState,
  FacetFilterDropdown,
  FilterChip,
  FlipClock,
  InitialsAvatar,
  Input,
  KpiCard,
  LineChart,
  LoadingPlaceholder,
  OrbitRadar,
  ReadingProgress,
  ScoreRing,
  SearchInput,
  Select,
  SemiGauge,
  SideBySideDiff,
  SidePanel,
  Skeleton,
  SortHeader,
  Sparkline,
  StackedBarChart,
  TableOfContents,
  TableViewToggle,
  Tabs,
  TimeSeriesChart,
  Treemap,
  UploadZone,
  absoluteUrl,
  formatPageTitle,
  useTableView,
} from '@arsenal/ui';

/**
 * Live demos for catalog entries that the main showroom switch does not cover.
 * Each demo renders the real component with sample data; nothing here calls a network API.
 */

const buttonClass =
  'rounded-arsenal-sm border border-arsenal-border bg-arsenal-elevated px-4 py-2 text-sm font-medium text-arsenal-primary transition-colors hover:border-arsenal-accent';

function Frame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'mx-auto w-full max-w-4xl' : 'mx-auto w-full max-w-lg'}>{children}</div>
  );
}

const treemapRows = [
  { symbol: 'AAPL', cap: 3000, change: 0.012 },
  { symbol: 'MSFT', cap: 2800, change: -0.004 },
  { symbol: 'NVDA', cap: 2200, change: 0.031 },
  { symbol: 'AMZN', cap: 1900, change: 0.008 },
  { symbol: 'GOOG', cap: 1800, change: -0.015 },
  { symbol: 'META', cap: 1200, change: 0.022 },
  { symbol: 'TSLA', cap: 700, change: -0.041 },
];

const equity = [100, 103, 101, 106, 109, 104, 111, 115, 112, 118, 121, 117, 124].map(
  (value, index) => ({
    time: `2026-01-${String(index + 2).padStart(2, '0')}`,
    value,
  }),
);

const tableRows = [
  { name: 'arsenal', stars: 120 },
  { name: 'vault', stars: 45 },
  { name: 'forge', stars: 88 },
  { name: 'sutra', stars: 61 },
  { name: 'orbit', stars: 17 },
  { name: 'ledger', stars: 34 },
  { name: 'atlas', stars: 9 },
];
type TableRow = (typeof tableRows)[number];
type TableKey = keyof TableRow;
const tableValue = (row: TableRow, key: TableKey) => row[key];

function TableViewDemo() {
  const t = useTableView<TableRow, TableKey>(tableRows, tableValue, {
    initialKey: 'stars',
    pageSize: 4,
  });
  return (
    <Frame>
      <table className="w-full text-sm text-arsenal-primary">
        <thead>
          <tr className="border-b border-arsenal-border">
            <SortHeader
              className="py-2"
              label="Name"
              ariaSort={t.ariaSort('name')}
              arrow={t.arrow('name')}
              onSort={() => t.toggleSort('name')}
            />
            <SortHeader
              className="py-2"
              label="Stars"
              align="right"
              ariaSort={t.ariaSort('stars')}
              arrow={t.arrow('stars')}
              onSort={() => t.toggleSort('stars')}
            />
          </tr>
        </thead>
        <tbody>
          {t.visibleRows.map((row) => (
            <tr key={row.name} className="border-b border-arsenal-border/60">
              <td className="py-2">{row.name}</td>
              <td className="py-2 text-right tabular-nums">{row.stars}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TableViewToggle
        total={t.total}
        pageSize={t.pageSize}
        expanded={t.expanded}
        onToggle={t.toggleExpanded}
      />
    </Frame>
  );
}

function FormFieldsDemo() {
  const [query, setQuery] = useState('');
  return (
    <form className="grid w-full max-w-sm gap-4" onSubmit={(event) => event.preventDefault()}>
      <Input label="Email" type="email" hint="We never share it." />
      <Select label="Plan" defaultValue="pro">
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </Select>
      <SearchInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search repos"
        clearLabel="Clear search"
      />
    </form>
  );
}

function TabsDemo() {
  const [tab, setTab] = useState('overview');
  return (
    <Tabs
      ariaLabel="Repository sections"
      value={tab}
      onChange={setTab}
      items={[
        { id: 'overview', label: 'Overview' },
        { id: 'issues', label: 'Issues', count: 12 },
        { id: 'archived', label: 'Archived', disabled: true },
      ]}
    />
  );
}

function AnimatedTabsDemo() {
  const [tab, setTab] = useState('day');
  return (
    <AnimatedTabs
      ariaLabel="Range"
      value={tab}
      onChange={setTab}
      items={[
        { id: 'day', label: '1D' },
        { id: 'week', label: '1W' },
        { id: 'month', label: '1M' },
        { id: 'year', label: '1Y' },
      ]}
    />
  );
}

function FilterChipDemo() {
  const [active, setActive] = useState<Record<string, boolean>>({ open: true });
  const chips = [
    { id: 'open', label: 'Open issues', count: 12 },
    { id: 'mine', label: 'Assigned to me', count: 3 },
    { id: 'stale', label: 'Stale', count: 7 },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <FilterChip
          key={chip.id}
          label={chip.label}
          count={chip.count}
          active={Boolean(active[chip.id])}
          onClick={() => setActive((prev) => ({ ...prev, [chip.id]: !prev[chip.id] }))}
        />
      ))}
    </div>
  );
}

function FacetDemo() {
  const [lang, setLang] = useState('');
  return (
    <FacetFilterDropdown
      ariaLabel="Filter by language"
      value={lang}
      onChange={setLang}
      totalCount={120}
      allLabel="All languages"
      items={[
        ['TypeScript', 64],
        ['Python', 38],
        ['Rust', 18],
      ]}
    />
  );
}

function SidePanelDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={buttonClass} onClick={() => setOpen(true)}>
        Open details panel
      </button>
      <SidePanel open={open} onClose={() => setOpen(false)} ariaLabelledBy="demo-panel-title">
        <div className="grid gap-4 p-6">
          <h2 id="demo-panel-title" className="text-xl font-semibold">
            Repository details
          </h2>
          <p className="text-sm text-arsenal-secondary">
            Focus stays inside the panel. Press Esc or click outside to close it.
          </p>
          <button type="button" className={buttonClass} onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </SidePanel>
    </>
  );
}

function UploadDemo() {
  return (
    <Frame>
      <UploadZone
        title="Drop a CSV here"
        hint="Demo only: the file stays in your browser"
        accept=".csv"
        onFile={async (_file, onProgress) => {
          for (let step = 1; step <= 10; step += 1) {
            await new Promise((resolve) => setTimeout(resolve, 120));
            onProgress(step / 10);
          }
        }}
      />
    </Frame>
  );
}

function SeoDemo() {
  // <Seo> rewrites document.head, so the gallery shows the card it would produce instead.
  const siteUrl = 'https://arsenal.example.com';
  return (
    <div className="w-full max-w-md overflow-hidden rounded-arsenal border border-arsenal-border bg-arsenal-elevated">
      <div className="h-24 bg-[linear-gradient(135deg,rgba(249,115,22,0.35),rgba(56,189,248,0.18))]" />
      <div className="grid gap-1 p-4">
        <p className="text-xs uppercase tracking-wide text-arsenal-secondary">
          {absoluteUrl(siteUrl, '/components')}
        </p>
        <p className="font-semibold text-arsenal-primary">
          {formatPageTitle('Components', 'Arsenal')}
        </p>
        <p className="text-sm text-arsenal-secondary">Browse the shared UI library.</p>
      </div>
    </div>
  );
}

function ReadingProgressDemo() {
  // A transform makes the fixed bar sit at the top of this frame instead of the window.
  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-arsenal border border-arsenal-border bg-arsenal-elevated p-6 [transform:translateZ(0)]">
      <ReadingProgress className="absolute h-1" />
      <p className="text-sm text-arsenal-secondary">
        Scroll this page: the bar at the top of this frame fills as you read.
      </p>
    </div>
  );
}

function ErrorDemo() {
  const [attempt, setAttempt] = useState(1);
  // One stable error per attempt, so ErrorState reports it once instead of on every render.
  const error = useMemo(() => new Error(`Request timed out (attempt ${attempt})`), [attempt]);
  return (
    <Frame>
      <ErrorState
        title="Could not load the dashboard"
        error={error}
        // Demo error: report it as info so the dev overlay does not flag an intended failure.
        onReport={(e) => console.info('[ErrorState demo]', e.message)}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    </Frame>
  );
}

/** A full-width scene box for the fx backgrounds, which fill their positioned parent. */
function FxScene({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="relative h-[240px] w-full overflow-hidden rounded-xl">
      {children}
      {hint ? (
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-arsenal-border bg-arsenal-surface px-3 py-1 text-xs text-arsenal-primary">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** three.js is optional: the 3D scenes load only when their card renders, never on the server. */
const SceneLoading = () => <div className="h-full w-full animate-pulse rounded-xl bg-arsenal-surface" />;
const GravityWell = dynamic(() => import('@arsenal/three').then((m) => m.GravityWell), {
  ssr: false,
  loading: SceneLoading,
});
const AnomalyMatrix = dynamic(() => import('@arsenal/three').then((m) => m.AnomalyMatrix), {
  ssr: false,
  loading: SceneLoading,
});
const CinematicPlate = dynamic(() => import('@arsenal/scene/react').then((m) => m.CinematicPlate), {
  ssr: false,
  loading: SceneLoading,
});

const HeroPieceDemo = dynamic(() => import('./hero-piece-demos').then((m) => m.HeroPieceDemo), {
  ssr: false,
  loading: SceneLoading,
});

/** The plate hero follows the playground theme: light plate and light grade in light mode. */
function CinematicPlateDemo() {
  const { scheme } = useArsenalTheme();
  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl bg-arsenal-surface">
      <CinematicPlate
        src="/assets/scene/plate-dark.webp"
        srcLight="/assets/scene/plate-light.webp"
        light={scheme === 'light'}
      />
    </div>
  );
}

/** Hero piece pages open on the real-time model; the painted plate stays one click away. */
export const HERO_PREVIEW_DEFAULT_MODE: 'art' | '3d' = '3d';

/**
 * A hero piece shown as its real-time 3D model by default; "Hero art" swaps in its region of the
 * painted plate with that piece's live layers, for comparison.
 */
function HeroPiecePreview({ piece }: { piece: HeroPlatePieceId }) {
  const { scheme } = useArsenalTheme();
  const [mode, setMode] = useState<'art' | '3d'>(HERO_PREVIEW_DEFAULT_MODE);
  const { crop, components } = HERO_PLATE_PIECES[piece];
  return (
    <div className="relative w-full">
      {mode === 'art' ? (
        <div className="relative h-[320px] w-full overflow-hidden rounded-xl">
          <CinematicPlate
            src="/assets/scene/plate-dark.webp"
            srcLight="/assets/scene/plate-light.webp"
            light={scheme === 'light'}
            crop={crop}
            components={components}
          />
        </div>
      ) : (
        <HeroPieceDemo piece={piece} />
      )}
      <div
        role="group"
        aria-label="Preview style"
        className="absolute right-3 top-3 flex rounded-full border border-arsenal-border bg-arsenal-surface p-0.5 text-[11px] font-medium"
      >
        {(
          [
            ['3d', 'Live 3D'],
            ['art', 'Hero art'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={`rounded-full px-2.5 py-1 transition-colors ${
              mode === id
                ? 'bg-arsenal-elevated text-arsenal-primary shadow-sm'
                : 'text-arsenal-secondary hover:text-arsenal-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ParticleBurstDemo() {
  const ref = useRef<ParticleBurstHandle>(null);
  return (
    <FxScene>
      <ParticleBurst ref={ref} />
      <div className="absolute inset-0 grid place-items-center">
        <button
          type="button"
          onClick={(event) => ref.current?.burst(event)}
          className="rounded-full bg-arsenal-accent px-5 py-2 text-sm font-semibold text-arsenal-background"
        >
          Complete task
        </button>
      </div>
    </FxScene>
  );
}

const DEMOS: Record<string, () => ReactNode> = {
  'animated-number': () => (
    <p className="text-5xl font-semibold tabular-nums text-arsenal-primary">
      <AnimatedNumber value={1284.5} decimals={1} delayMs={120} suffix=" pts" />
    </p>
  ),
  'delta-pill': () => (
    <div className="flex flex-wrap gap-2">
      <DeltaPill value={0.034} label="vs last week" />
      <DeltaPill value={-1250} kind="money" currency="USD" />
      <DeltaPill value={null} />
    </div>
  ),
  sparkline: () => (
    <div className="flex items-center gap-4 text-arsenal-primary">
      <Sparkline
        values={[4, 6, 5, 9, 7, 12, 11, 14, 13, 17]}
        label="Stars, last 10 days"
        width={200}
        height={56}
      />
      <span className="text-2xl font-semibold tabular-nums">17</span>
    </div>
  ),
  'score-ring': () => (
    <ScoreRing
      score={82}
      max={100}
      label="Health score"
      meaning="Above the portfolio median"
      size={140}
    />
  ),
  'semi-gauge': () => (
    <SemiGauge share={0.64} label="Risk appetite" valueLabel="64%" showLegend width={280} />
  ),
  treemap: () => (
    <Frame wide>
      <Treemap
        items={treemapRows}
        label="Market map"
        getKey={(row) => row.symbol}
        getLabel={(row) => row.symbol}
        getWeight={(row) => row.cap}
        getValue={(row) => row.change}
      />
    </Frame>
  ),
  'donut-chart': () => (
    <DonutChart
      label="Allocation by sector"
      centerValue="$48k"
      centerLabel="Total"
      segments={[
        { key: 'tech', label: 'Tech', value: 52 },
        { key: 'energy', label: 'Energy', value: 18 },
        { key: 'cash', label: 'Cash', value: 30 },
      ]}
    />
  ),
  'stacked-bar-chart': () => (
    <Frame>
      <StackedBarChart
        label="Runs by outcome"
        series={[
          { key: 'pass', label: 'Passed', color: 'var(--arsenal-success)' },
          { key: 'fail', label: 'Failed', color: 'var(--arsenal-danger)' },
        ]}
        rows={[
          { label: 'Mon', values: { pass: 12, fail: 2 } },
          { label: 'Tue', values: { pass: 9, fail: 4 } },
          { label: 'Wed', values: { pass: 14, fail: 1 } },
          { label: 'Thu', values: { pass: 11, fail: 3 } },
          { label: 'Fri', values: { pass: 16, fail: 0 } },
        ]}
      />
    </Frame>
  ),
  'line-chart': () => (
    <Frame>
      <LineChart
        label="Win rate"
        unit="%"
        points={[
          { label: 'Jan', value: 48 },
          { label: 'Feb', value: 53 },
          { label: 'Mar', value: null },
          { label: 'Apr', value: 57 },
          { label: 'May', value: 55 },
          { label: 'Jun', value: 61 },
        ]}
      />
    </Frame>
  ),
  'distribution-bars': () => (
    <Frame>
      <DistributionBars
        label="Holding period"
        buckets={[
          { key: 'd1', label: 'Under 1 day', count: 14 },
          { key: 'w1', label: '1 to 7 days', count: 31 },
          { key: 'm1', label: 'Over a week', count: 9 },
        ]}
      />
    </Frame>
  ),
  'time-series-chart': () => (
    <Frame wide>
      <TimeSeriesChart
        label="Equity curve"
        fitContent
        series={[{ id: 'equity', type: 'area', color: '--arsenal-accent', data: equity }]}
        priceLines={[{ seriesId: 'equity', price: 100, title: 'Start', dashed: true }]}
      />
    </Frame>
  ),
  'drawdown-chart': () => (
    <Frame wide>
      <DrawdownChart
        label="Strategy drawdown"
        points={[
          { date: '2026-01-02', equity: 100 },
          { date: '2026-01-09', equity: 112 },
          { date: '2026-01-16', equity: 98 },
          { date: '2026-01-23', equity: 115 },
          { date: '2026-01-30', equity: 108 },
          { date: '2026-02-06', equity: 121 },
        ]}
      />
    </Frame>
  ),
  'data-ridge-background': () => (
    <Frame wide>
      <DataRidgeBackground
        series={{
          label: 'Daily volume',
          from: '2026-01-01',
          to: '2026-01-07',
          values: [4, 7, 5, 9, 12, 8, 10],
        }}
        className="min-h-[220px] rounded-arsenal"
      >
        <h3 className="p-8 text-3xl font-semibold text-arsenal-primary">Markets at a glance</h3>
      </DataRidgeBackground>
    </Frame>
  ),
  'form-fields': () => <FormFieldsDemo />,
  card: () => (
    <Frame>
      <Card variant="status" status="success" onActivate={() => undefined}>
        <CardHeader eyebrow="Pipeline" title="Nightly build" />
        <CardBody>All 42 checks passed.</CardBody>
        <CardFooter>Finished 3 minutes ago</CardFooter>
      </Card>
    </Frame>
  ),
  skeleton: () => (
    <div className="grid w-full max-w-md gap-6">
      <LoadingPlaceholder label="Loading repositories" shape="list" rows={3} />
      <Skeleton variant="block" height={72} />
    </div>
  ),
  'error-state': () => <ErrorDemo />,
  tabs: () => <TabsDemo />,
  'animated-tabs': () => <AnimatedTabsDemo />,
  'filter-chip': () => <FilterChipDemo />,
  'facet-filter-dropdown': () => <FacetDemo />,
  'table-view': () => <TableViewDemo />,
  'kpi-card': () => (
    <Frame>
      <KpiCard
        label="Open positions"
        value={14}
        accent="cyan"
        meter={0.7}
        hint="3 added today"
        insight={{
          headline: 'Concentrated in tech',
          rows: [
            { label: 'Tech', value: '9' },
            { label: 'Energy', value: '5' },
          ],
        }}
        action={{ href: '#', label: 'View all' }}
      />
    </Frame>
  ),
  'confirm-dialog': () => (
    <ConfirmDialog
      trigger={
        <button type="button" className={buttonClass}>
          Delete repo
        </button>
      }
      title="Delete this repository?"
      description="Demo only: confirming does nothing."
      confirmLabel="Delete"
      tone="danger"
      onConfirm={async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }}
    />
  ),
  'side-panel': () => <SidePanelDemo />,
  'side-by-side-diff': () => (
    <Frame wide>
      <SideBySideDiff
        beforeLabel="main"
        afterLabel="feature"
        files={[
          {
            file: 'src/app.ts',
            status: 'modified',
            additions: 2,
            deletions: 1,
            hunks: [
              {
                header: '@@ -1,3 +1,4 @@',
                oldStart: 1,
                oldLines: 3,
                newStart: 1,
                newLines: 4,
                lines: [
                  { type: 'context', content: 'const a = 1;', oldLineNumber: 1, newLineNumber: 1 },
                  { type: 'deletion', content: 'const b = 2;', oldLineNumber: 2 },
                  { type: 'addition', content: 'const b = 3;', newLineNumber: 2 },
                  { type: 'addition', content: 'const c = a + b;', newLineNumber: 3 },
                  {
                    type: 'context',
                    content: 'export { a, b };',
                    oldLineNumber: 3,
                    newLineNumber: 4,
                  },
                ],
              },
            ],
          },
        ]}
      />
    </Frame>
  ),
  'asset-icon': () => (
    <span className="inline-flex items-center gap-3 text-lg text-arsenal-primary">
      <AssetIcon name="trend" basePath="/demo-icons" ext="svg" size={40} />
      Trending up
    </span>
  ),
  'initials-avatar': () => (
    <div className="flex items-center gap-3">
      {['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson'].map((name) => (
        <InitialsAvatar key={name} name={name} size={44} letters={2} />
      ))}
    </div>
  ),
  'upload-zone': () => <UploadDemo />,
  'flip-clock': () => <FlipClock hour12={false} seconds scale={0.8} />,
  'table-of-contents': () => (
    <TableOfContents
      title="On this page"
      items={[
        { id: 'setup', text: 'Setup', level: 2 },
        { id: 'tailwind', text: 'Tailwind preset', level: 3 },
        { id: 'usage', text: 'Usage', level: 2 },
        { id: 'theming', text: 'Theming', level: 2 },
      ]}
    />
  ),
  'reading-progress': () => <ReadingProgressDemo />,
  seo: () => <SeoDemo />,
  'orbit-radar': () => (
    <OrbitRadar status="running" size={180} label="Scanning repositories">
      <span className="text-lg font-semibold tabular-nums text-arsenal-primary">42</span>
    </OrbitRadar>
  ),
  'aurora-background': () => (
    <FxScene>
      <AuroraBackground intensity={0.9} vignette />
    </FxScene>
  ),
  'cosmic-particle-background': () => (
    <FxScene hint="Move the pointer through the stars">
      <CosmicParticleBackground interactive />
    </FxScene>
  ),
  'galaxy-particle-canvas': () => (
    <FxScene hint="Move the pointer to part the arms">
      <GalaxyParticleCanvas interactive maxCount={900} />
    </FxScene>
  ),
  'infinity-particle-canvas': () => (
    <FxScene hint="Move the pointer through the loop">
      <InfinityParticleCanvas interactive />
    </FxScene>
  ),
  'interactive-particles': () => (
    <FxScene hint="Hover to part, press and hold to gather">
      <InteractiveParticles interactive />
    </FxScene>
  ),
  'morphing-sphere': () => (
    <div className="w-full">
      <MorphingSphere showControls links height={260} />
    </div>
  ),
  'noise-texture': () => (
    <FxScene>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--arsenal-accent) 45%, transparent), var(--arsenal-surface) 55%, var(--arsenal-background))',
        }}
      />
      <NoiseTexture opacity={0.09} />
    </FxScene>
  ),
  'particle-burst': () => <ParticleBurstDemo />,
  'gravity-well': () => (
    <FxScene>
      <GravityWell particleCount={1800} />
    </FxScene>
  ),
  'anomaly-matrix': () => (
    <FxScene>
      <AnomalyMatrix detail={40} scale={0.95} charge={0.35} />
    </FxScene>
  ),
  'cinematic-plate': () => <CinematicPlateDemo />,
  'island-base': () => <HeroPiecePreview piece='island-base' />,
  'bonsai-tree': () => <HeroPiecePreview piece='bonsai-tree' />,
  'waterfall': () => <HeroPiecePreview piece='waterfall' />,
  'water-basin': () => <HeroPiecePreview piece='water-basin' />,
  'orbital-ring': () => <HeroPiecePreview piece='orbital-ring' />,
  'core-sphere': () => <HeroPiecePreview piece='core-sphere' />,
  'service-node': () => <HeroPiecePreview piece='service-node' />,
  'data-path': () => <HeroPiecePreview piece='data-path' />,
  'scene-accents': () => <HeroPiecePreview piece='scene-accents' />,
  'weather-canvas': () => (
    <FxScene>
      <WeatherCanvas precip="rain" intensity={0.7} wind={0.3} ripples />
    </FxScene>
  ),
};

export function hasCatalogPreview(id: string): boolean {
  return id in DEMOS;
}

export function CatalogPreview({ id }: { id: string }) {
  const render = DEMOS[id];
  return render ? (
    <div className="flex w-full min-w-0 justify-center [&>*]:max-w-full">{render()}</div>
  ) : null;
}
