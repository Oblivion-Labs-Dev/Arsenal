'use client';

import { useState } from 'react';
import { ClayFlowDiagram } from '@arsenal/clayflow/react';
import type { Bar, Lines, StockChartLevels } from '../StockChart.js';
import { StockChart } from '../StockChart.js';
import { gaugeAngle, portfolioProfitLoss, positionSizePerThousand, riskReward } from './math.js';
import './dashboard.css';

export interface StockIndex {
  name: string;
  value: string;
  change: number;
  sparkline: number[];
}
export interface StockPick {
  ticker: string;
  name: string;
  price: number;
  verdict: 'Buy' | 'Watch' | 'Avoid';
  confidence: number;
  reason: string;
  raw?: string;
}

export function StockHero({ headline, explainer }: { headline: string; explainer: string }) {
  return (
    <section className="si-card si-hero">
      <div className="si-hero-copy">
        <p className="si-eyebrow">Market insights</p>
        <h1>{headline}</h1>
        <p>{explainer}</p>
      </div>
      <svg
        className="si-hero-art"
        viewBox="0 0 220 150"
        role="img"
        aria-label="Clay bull and rising market bars"
      >
        <ellipse cx="105" cy="128" rx="94" ry="12" fill="currentColor" opacity=".12" />
        <path
          d="M30 119h155"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          opacity=".45"
        />
        <rect x="132" y="66" width="24" height="53" rx="7" fill="currentColor" opacity=".55" />
        <rect x="163" y="42" width="25" height="77" rx="7" fill="currentColor" opacity=".76" />
        <path
          d="m139 62 32-26 18 10 22-30"
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m202 16 12-2-2 13"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M33 90c0-24 17-40 44-40 16 0 26 6 36 17l16 2 10 13-10 8-7 22H52l-8-13H33z"
          fill="currentColor"
          opacity=".82"
        />
        <path
          d="m48 54-16-17c-8-7-17-3-16 5 2 9 11 17 24 20m73 5 12-17c7-11 17-13 22-7 4 6-2 17-15 27"
          fill="currentColor"
          opacity=".7"
        />
        <circle cx="93" cy="71" r="3" fill="var(--si-surface-raised)" />
      </svg>
    </section>
  );
}

export function IndexTiles({ indices }: { indices: StockIndex[] }) {
  return (
    <div className="si-index-grid">
      {indices.map((index) => (
        <article className="si-index" key={index.name}>
          <span className="si-index-name">{index.name}</span>
          <strong className="si-index-value">{index.value}</strong>
          <span className="si-index-change" data-down={index.change < 0}>
            {index.change >= 0 ? '+' : '−'}
            {Math.abs(index.change).toFixed(2)}%
          </span>
          <svg
            className="si-spark"
            data-down={index.change < 0}
            viewBox="0 0 66 28"
            role="img"
            aria-label={`${index.name} illustrative sparkline`}
          >
            <polyline
              points={index.sparkline
                .map(
                  (v, i) => `${i * (66 / Math.max(index.sparkline.length - 1, 1))},${26 - v * 22}`,
                )
                .join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </article>
      ))}
    </div>
  );
}

export function MarketMoodGauge({
  value,
  label,
  caption,
}: {
  value: number;
  label: string;
  caption: string;
}) {
  const angle = gaugeAngle(value);
  const dash = Math.max(0, Math.min(100, value)) * 1.57;
  return (
    <div className="si-card">
      <p className="si-eyebrow">Market mood</p>
      <div className="si-gauge">
        <svg
          className="si-gauge-svg"
          viewBox="0 0 120 75"
          role="img"
          aria-label={`Market mood ${value} out of 100`}
        >
          <path className="si-gauge-track" d="M13 62a47 47 0 0 1 94 0" />
          <path
            className="si-gauge-value"
            d="M13 62a47 47 0 0 1 94 0"
            style={{ strokeDashoffset: 157 - dash }}
          />
          <path
            d="M60 60 60 35"
            stroke="var(--fg)"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${angle} 60 60)`}
          />
          <circle cx="60" cy="60" r="5" fill="var(--fg)" />
          <text x="60" y="74" textAnchor="middle" fill="var(--muted)" fontSize="9">
            FEAR ← → GREED
          </text>
        </svg>
        <div>
          <strong>{label}</strong>
          <p>{caption}</p>
        </div>
      </div>
    </div>
  );
}

export function StockPickCard({ pick, advanced = false }: { pick: StockPick; advanced?: boolean }) {
  return (
    <article className="si-pick">
      <div className="si-pick-head">
        <span className="si-ticker">{pick.ticker.slice(0, 5)}</span>
        <div>
          <h3>{pick.ticker}</h3>
          <span className="si-muted" style={{ fontSize: 11 }}>
            {pick.name}
          </span>
        </div>
      </div>
      <div className="si-pick-price">
        <span>₹{pick.price.toLocaleString('en-IN')}</span>
        <span className="si-muted" style={{ fontSize: 11 }}>
          {pick.confidence}% confidence
        </span>
      </div>
      <span className="si-verdict" data-verdict={pick.verdict}>
        {pick.verdict === 'Buy' ? '↑' : pick.verdict === 'Avoid' ? '↓' : '•'} {pick.verdict}
      </span>
      <p>{pick.reason}</p>
      {advanced && pick.raw && <div className="si-advanced">{pick.raw}</div>}
    </article>
  );
}

export function WhenToBuySell({
  bars,
  lines,
  from,
  levels,
  advanced = false,
}: {
  bars: Bar[];
  lines: Lines;
  from: string;
  levels: StockChartLevels;
  advanced?: boolean;
}) {
  return (
    <section className="si-card">
      <h2>When to Buy &amp; Sell</h2>
      <div className="si-chart-wrap">
        <StockChart
          bars={bars}
          lines={lines}
          overlays={{ sma: false, ema: false, bands: false, rsi: false, macd: false }}
          from={from}
          tradeLevels={levels}
        />
      </div>
      <div className="si-legend">
        <span>
          <i className="si-dot" />
          Buy zone · ₹{levels.buyZone?.[0]}–{levels.buyZone?.[1]}
        </span>
        <span>
          <i className="si-dot" data-type="target" />
          Target · ₹{levels.target}
        </span>
        <span>
          <i className="si-dot" data-type="exit" />
          Exit if below · ₹{levels.exit}
        </span>
      </div>
      {advanced && (
        <div className="si-advanced">
          Levels are illustrative price references included in this sample.
        </div>
      )}
    </section>
  );
}

export function TradePlanCard({
  entry,
  target,
  stop,
  advanced = false,
}: {
  entry: [number, number];
  target: number;
  stop: number;
  advanced?: boolean;
}) {
  const mid = (entry[0] + entry[1]) / 2;
  const rr = riskReward(mid, target, stop);
  const shares = positionSizePerThousand(mid, stop);
  return (
    <section className="si-card">
      <h2>Trade Plan</h2>
      <div className="si-plan-list">
        <div className="si-plan-row">
          <span>Entry zone</span>
          <strong>
            ₹{entry[0]}–{entry[1]}
          </strong>
        </div>
        <div className="si-plan-row">
          <span>Target</span>
          <strong className="si-positive">₹{target}</strong>
        </div>
        <div className="si-plan-row">
          <span>Stop / exit</span>
          <strong className="si-negative">₹{stop}</strong>
        </div>
        <hr className="si-rule" />
        <div className="si-plan-row">
          <span>Risk / reward</span>
          <strong>{rr === null ? 'Unavailable' : `1 : ${rr.toFixed(1)}`}</strong>
        </div>
        <div className="si-plan-row">
          <span>Shares per ₹1,000</span>
          <strong>{shares ?? 'Unavailable'}</strong>
        </div>
      </div>
      {advanced && (
        <p className="si-advanced">
          Position size assumes ₹10 planned risk per ₹1,000. Actual risk varies.
        </p>
      )}
    </section>
  );
}

export function PaperPortfolioCard({
  value,
  invested,
  holdings,
  advanced = false,
}: {
  value: number;
  invested: number;
  holdings: { ticker: string; value: number }[];
  advanced?: boolean;
}) {
  const pnl = portfolioProfitLoss(value, invested);
  return (
    <section className="si-card">
      <p className="si-eyebrow">Practice account</p>
      <h2>My Paper Portfolio</h2>
      <div className="si-portfolio-value">
        <span className="si-muted">Current value</span>
        <strong>₹{value.toLocaleString('en-IN')}</strong>
      </div>
      <strong className={pnl >= 0 ? 'si-positive' : 'si-negative'}>
        {pnl >= 0 ? '+' : '−'}₹{Math.abs(pnl).toLocaleString('en-IN')} ({pnl >= 0 ? '+' : ''}
        {((pnl / invested) * 100).toFixed(1)}%)
      </strong>
      <ul className="si-holdings">
        {holdings.map((item) => (
          <li key={item.ticker}>
            <span>{item.ticker}</span>
            <strong>₹{item.value.toLocaleString('en-IN')}</strong>
          </li>
        ))}
      </ul>
      {advanced && (
        <p className="si-advanced">Invested amount: ₹{invested.toLocaleString('en-IN')}</p>
      )}
    </section>
  );
}

export function WhyThisStock({ items }: { items: { title: string; body: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="si-card si-why">
      <h2>Why This Stock?</h2>
      <div className="si-accordion">
        {items.map((item, index) => (
          <div className="si-accordion-item" key={item.title}>
            <button
              type="button"
              aria-expanded={open === index}
              onClick={() => setOpen(open === index ? null : index)}
            >
              <span>{item.title}</span>
              <span aria-hidden="true">{open === index ? '−' : '+'}</span>
            </button>
            {open === index && <p>{item.body}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

const pipelineSpec = {
  schemaVersion: '1.0',
  id: 'stock-pipeline',
  title: 'How a sample pick is formed',
  topic: 'finance',
  nodes: [
    { id: 'news', kind: 'document', label: 'Market News' },
    { id: 'financial-data', kind: 'data', label: 'Financial Data' },
    { id: 'analysis', kind: 'ai', label: 'Analysis & AI' },
    { id: 'pick', kind: 'goal', label: 'Stock Pick' },
  ],
  edges: [
    { id: 'news-data', from: 'news', to: 'financial-data' },
    { id: 'data-analysis', from: 'financial-data', to: 'analysis' },
    { id: 'analysis-pick', from: 'analysis', to: 'pick' },
  ],
} as const;
export function PipelineFlow() {
  return (
    <section className="si-card">
      <h2>ClayFlow: How We Arrive at a Pick</h2>
      <ClayFlowDiagram spec={pipelineSpec} />
    </section>
  );
}

export function MarketGlance({ items }: { items: { label: string; value: string }[] }) {
  return (
    <section className="si-card">
      <h2>Market at a Glance</h2>
      <div className="si-glance">
        {items.map((item) => (
          <div className="si-glance-item" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: 'beginner' | 'advanced';
  onChange: (mode: 'beginner' | 'advanced') => void;
}) {
  return (
    <div className="si-mode" data-advanced={mode === 'advanced'}>
      <button type="button" aria-pressed={mode === 'beginner'} onClick={() => onChange('beginner')}>
        Beginner
      </button>
      <button type="button" aria-pressed={mode === 'advanced'} onClick={() => onChange('advanced')}>
        Advanced
      </button>
    </div>
  );
}
