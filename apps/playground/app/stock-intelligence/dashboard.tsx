'use client';

import { useState } from 'react';
import {
  IndexTiles,
  MarketGlance,
  MarketMoodGauge,
  ModeSwitch,
  PaperPortfolioCard,
  PipelineFlow,
  StockHero,
  StockPickCard,
  TradePlanCard,
  WhenToBuySell,
  WhyThisStock,
  defaultAssetBase,
} from '@arsenal/stock-kit';
import {
  glance,
  mood,
  portfolio,
  reasons,
  sampleBars,
  sampleIndices,
  sampleLevels,
  sampleLines,
  samplePicks,
} from './sample-data';

export function StockIntelligenceDashboard() {
  const assetBase = defaultAssetBase;
  const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner');
  const advanced = mode === 'advanced';
  return (
    <main id="overview" className="manthan-clay si-dashboard">
      <aside className="si-rail">
        <div className="si-brand">
          <span className="si-brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M20 34C7 30 5 17 20 5c15 12 13 25 0 29Z"/><path d="M20 34c-7-8-9-16 0-29 9 13 7 21 0 29ZM7 24c3 1 6 3 8 7m18-7c-3 1-6 3-8 7"/></svg></span>
          <span>
            Manthan
            <br />
            <small>Stock Intelligence</small>
          </span>
        </div>
        <p className="si-rail-caption">Research · Analysis · Insights</p>
        <nav className="si-nav" aria-label="Main navigation">
          {[
            ['Overview', 'growth', 'overview'], ['Stock picks', 'target', 'stock-picks'], ['Market trends', 'data', 'market-trends'],
            ['My portfolio', 'card', 'portfolio'], ['Watchlist', 'idea', 'watchlist'], ['Learn & explore', 'learning', 'learn-explore'],
          ].map(([label, icon, target], index) => <a className="si-nav-link" data-active={index === 0} href={`#${target}`} key={label}><img src={`${assetBase}/${icon}.webp`} alt="" /><span>{label}</span></a>)}
        </nav>
        <ModeSwitch mode={mode} onChange={setMode} />
      </aside>
      <div className="si-page-content">
        <p className="si-sample-note">Sample data — not live prices or advice</p>
        <div className="si-layout">
          <div className="si-main">
            <StockHero
              headline="Stock Intelligence"
              explainer="Research-backed stock ideas, market trends and investing insights — in a clear, simple and meaningful way."
            />
            <IndexTiles indices={sampleIndices} assetBase={assetBase} />
            <section id="stock-picks" className="si-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 10,
                }}
              >
                <h2>Today’s sample stock picks</h2>
                <span className="si-muted" style={{ fontSize: 11 }}>
                  Illustrative only
                </span>
              </div>
              <div className="si-picks">
                {samplePicks.map((pick) => (
                  <StockPickCard key={pick.ticker} pick={pick} advanced={advanced} assetBase={assetBase} />
                ))}
              </div>
            </section>
            <div className="si-two">
              <WhenToBuySell
                bars={sampleBars}
                lines={sampleLines}
                from={sampleBars[0]!.date}
                levels={sampleLevels}
                advanced={advanced}
              />
              <TradePlanCard
                entry={sampleLevels.buyZone}
                target={sampleLevels.target}
                stop={sampleLevels.exit}
                advanced={advanced}
                assetBase={assetBase}
              />
            </div>
            <MarketGlance items={glance} assetBase={assetBase} />
          </div>
          <aside className="si-aside">
            <PaperPortfolioCard {...portfolio} advanced={advanced} assetBase={assetBase} />
            <MarketMoodGauge {...mood} assetBase={assetBase} />
            <WhyThisStock items={reasons} assetBase={assetBase} />
          </aside>
        </div>
        {/* Full-width row: the five-stage flow needs ~1000px to stay horizontal; in a column it stacks vertically. */}
        <PipelineFlow />
      </div>
    </main>
  );
}
