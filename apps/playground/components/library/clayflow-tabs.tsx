'use client';

import { ClayFlowDiagram } from '@arsenal/clayflow/react';
import '@arsenal/clayflow/react.css';
import {
  MarketGlance,
  MarketMoodGauge,
  PaperPortfolioCard,
  PipelineFlow,
  StockPickCard,
  TradePlanCard,
  WhyThisStock,
  defaultAssetBase,
} from '@arsenal/stock-kit';
import '@arsenal/stock-kit/styles.css';
import { motion, useReducedMotion } from 'framer-motion';
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  glance,
  mood,
  portfolio,
  reasons,
  sampleLevels,
  samplePicks,
} from '@/app/stock-intelligence/sample-data';
import { CLAYFLOW_GROUPS, type ClayFlowGroupId } from '@/lib/clayflow-groups';
import './clayflow-tabs.css';

const GRID: Record<ClayFlowGroupId, string> = {
  nodes: 'sm:grid-cols-2 lg:grid-cols-3',
  connectors: 'sm:grid-cols-2 lg:grid-cols-4',
  flows: 'lg:grid-cols-2',
  transformations: 'sm:grid-cols-2',
  stock: '',
};

function StockCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="cft-card site-card p-4">
      <h3 className="cft-card-title">{title}</h3>
      <div className="mt-3">{children}</div>
    </article>
  );
}

function StockPanel() {
  const assetBase = defaultAssetBase;
  return (
    <div className="manthan-clay cft-stock">
      <p className="cft-sample">Sample data, not live prices or advice</p>
      <div className="grid gap-5 lg:grid-cols-3">
        {samplePicks.map((pick) => (
          <StockCard key={pick.ticker} title="Stock pick card">
            <StockPickCard pick={pick} advanced={false} assetBase={assetBase} />
          </StockCard>
        ))}
        <StockCard title="Trade plan">
          <TradePlanCard
            entry={sampleLevels.buyZone}
            target={sampleLevels.target}
            stop={sampleLevels.exit}
            advanced={false}
            assetBase={assetBase}
          />
        </StockCard>
        <StockCard title="Paper portfolio">
          <PaperPortfolioCard {...portfolio} advanced={false} assetBase={assetBase} />
        </StockCard>
        <StockCard title="Market mood">
          <MarketMoodGauge {...mood} assetBase={assetBase} />
        </StockCard>
        <StockCard title="Why this stock">
          <WhyThisStock items={reasons} assetBase={assetBase} />
        </StockCard>
        <div className="lg:col-span-2">
          <StockCard title="Market at a glance">
            <MarketGlance items={glance} assetBase={assetBase} />
          </StockCard>
        </div>
      </div>
      <div className="mt-5">
        <StockCard title="Research pipeline">
          <PipelineFlow />
        </StockCard>
      </div>
    </div>
  );
}

/** The ClayFlow tab of /components: ClayFlow diagrams and stock-kit cards, grouped by sub-tab. */
export function ClayFlowTabs() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<ClayFlowGroupId>('nodes');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const group = CLAYFLOW_GROUPS.find((g) => g.id === active) ?? CLAYFLOW_GROUPS[0]!;

  // WAI-ARIA tabs: arrow keys move between tabs and select them; Home/End jump to the ends.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = CLAYFLOW_GROUPS.findIndex((g) => g.id === active);
    const last = CLAYFLOW_GROUPS.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(CLAYFLOW_GROUPS[next]!.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label="ClayFlow component groups"
        onKeyDown={onKeyDown}
        className="site-scroll-x -mx-[var(--site-gutter)] flex gap-1 px-[var(--site-gutter)]"
      >
        {CLAYFLOW_GROUPS.map((g, i) => {
          const selected = g.id === active;
          return (
            <button
              key={g.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`cft-tab-${g.id}`}
              aria-selected={selected}
              aria-controls={`cft-panel-${g.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(g.id)}
              className="relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium"
            >
              {selected ? (
                <motion.span
                  layoutId="clayflow-subtab"
                  className="absolute inset-0 rounded-full border border-arsenal-border-hover bg-arsenal-elevated"
                  transition={
                    reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }
                  }
                />
              ) : null}
              <span
                className={`relative ${selected ? 'text-arsenal-primary' : 'text-arsenal-secondary hover:text-arsenal-primary'}`}
              >
                {g.label}
                {g.specs.length ? (
                  <span className="ml-1 text-arsenal-muted">{g.specs.length}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        id={`cft-panel-${group.id}`}
        aria-labelledby={`cft-tab-${group.id}`}
        className="mt-6"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-sm text-arsenal-secondary">{group.blurb}</p>
          <a
            href={group.href}
            className="shrink-0 text-sm text-arsenal-accent underline-offset-4 hover:underline"
          >
            Open full page →
          </a>
        </div>
        {group.id === 'stock' ? (
          <div className="mt-5">
            <StockPanel />
          </div>
        ) : (
          <div className={`mt-5 grid gap-5 ${GRID[group.id]}`}>
            {group.specs.map((spec) => (
              <article key={spec.id} className="cft-card site-card p-4">
                <h3 className="cft-card-title">{spec.title}</h3>
                {group.id === 'flows' || group.id === 'transformations' ? (
                  <p className="mt-1 text-sm text-arsenal-secondary">{spec.summary}</p>
                ) : null}
                <div className="mt-3">
                  <ClayFlowDiagram spec={spec} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
