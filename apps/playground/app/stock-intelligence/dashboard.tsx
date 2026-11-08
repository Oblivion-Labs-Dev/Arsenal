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
  const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner');
  const advanced = mode === 'advanced';
  return (
    <main className="manthan-clay si-dashboard">
      <aside className="si-rail">
        <div className="si-brand">
          <span className="si-brand-mark" aria-hidden="true">
            ✿
          </span>
          <span>
            Manthan
            <br />
            <small>Stock Intelligence</small>
          </span>
        </div>
        <p className="si-rail-caption">Research · Analysis · Insights</p>
        <nav className="si-nav" aria-label="Main navigation">
          <span>⌂ &nbsp; Overview</span>
          <span>▧ &nbsp; Stock picks</span>
          <span>⌁ &nbsp; Market trends</span>
          <span>♡ &nbsp; My portfolio</span>
          <span>☆ &nbsp; Watchlist</span>
          <span>ⓘ &nbsp; Learn &amp; explore</span>
        </nav>
        <ModeSwitch mode={mode} onChange={setMode} />
      </aside>
      <div className="si-page-content">
        <div className="si-layout">
          <div className="si-main">
            <StockHero
              headline="Stock Intelligence"
              explainer="Research ideas, market patterns and investing concepts in clear, simple language."
            />
            <IndexTiles indices={sampleIndices} />
            <section className="si-card">
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
                  <StockPickCard key={pick.ticker} pick={pick} advanced={advanced} />
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
              />
            </div>
            <MarketGlance items={glance} />
          </div>
          <aside className="si-aside">
            <PaperPortfolioCard {...portfolio} advanced={advanced} />
            <MarketMoodGauge {...mood} />
            <WhyThisStock items={reasons} />
            <PipelineFlow />
          </aside>
        </div>
        <p className="si-sample-note">Sample data — not live prices or advice</p>
      </div>
    </main>
  );
}
