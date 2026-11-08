'use client';

import { useEffect, useState } from 'react';
import { ClayFlowDiagram } from '@arsenal/clayflow/react';
import type { Bar, Lines, StockChartLevels } from '../StockChart.js';
import { StockChart } from '../StockChart.js';
import { easeOutCubic, gaugeAngle, portfolioProfitLoss, positionSizePerThousand, riskReward } from './math.js';
import './dashboard.css';

export const defaultAssetBase = '/assets/clayflow';
const asset = (base: string, name: string) => `${base.replace(/\/$/, '')}/${name}.webp`;

function useCountUp(value: number) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return; }
    const start = performance.now();
    let frameId = 0;
    const frame = (now: number) => {
      const progress = Math.min(1, (now - start) / 650);
      setShown(Math.round(value * easeOutCubic(progress)));
      if (progress < 1) frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [value]);
  return shown;
}

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

export function StockHero({ headline, explainer, assetBase = defaultAssetBase }: { headline: string; explainer: string; assetBase?: string }) {
  return (
    <section className="si-card si-hero">
      <div className="si-hero-copy">
        <p className="si-eyebrow">Market insights</p>
        <h1>{headline}</h1>
        <p>{explainer}</p>
      </div>
      <div className="si-hero-art" aria-hidden="true">
        <span className="si-hero-orbit" />
        <img className="si-hero-growth" src={asset(assetBase, 'growth')} alt="" />
        <img className="si-hero-bull" src={asset(assetBase, 'finance')} alt="" />
        <img className="si-hero-launch" src={asset(assetBase, 'launch')} alt="" />
      </div>
    </section>
  );
}

export function IndexTiles({ indices, assetBase = defaultAssetBase }: { indices: StockIndex[]; assetBase?: string }) {
  return <div className="si-index-grid">
    {indices.map((index) => <article className="si-index" key={index.name}>
      <img src={asset(assetBase, 'growth')} alt="" />
      <div><span className="si-index-name">{index.name}</span><strong className="si-index-value">{index.value}</strong></div>
      <span className="si-index-change" data-down={index.change < 0}>{index.change >= 0 ? '+' : '−'}{Math.abs(index.change).toFixed(2)}%</span>
      <svg className="si-spark" data-down={index.change < 0} viewBox="0 0 66 28" role="img" aria-label={`${index.name} illustrative sparkline`}>
        <polyline points={index.sparkline.map((v, i) => `${i * (66 / Math.max(index.sparkline.length - 1, 1))},${26 - v * 1.6}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </article>)}
  </div>;
}

export function MarketMoodGauge({ value, label, caption, assetBase = defaultAssetBase }: { value: number; label: string; caption: string; assetBase?: string }) {
  const [angle, setAngle] = useState(-90);
  const clampedValue = Math.max(0, Math.min(100, value));
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setAngle(gaugeAngle(clampedValue)); return; }
    const start = performance.now();
    const frame = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - progress, 4);
      setAngle(-90 + (gaugeAngle(clampedValue) + 90) * eased);
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [clampedValue]);
  const dash = clampedValue * 1.57;
  return <section className="si-card si-mood-card">
    <div className="si-mood-heading"><img src={asset(assetBase, 'idea')} alt="" /><div><p className="si-eyebrow">Market mood</p><strong>{label}</strong></div></div>
    <div className="si-gauge">
      <svg className="si-gauge-svg" viewBox="0 0 120 75" role="img" aria-label={`Market mood ${clampedValue} out of 100`}>
        <path className="si-gauge-track" d="M13 62a47 47 0 0 1 94 0" />
        <path className="si-gauge-value" d="M13 62a47 47 0 0 1 94 0" style={{ strokeDashoffset: 157 - dash }} />
        <path d="M60 60 60 35" stroke="var(--fg)" strokeWidth="3" strokeLinecap="round" transform={`rotate(${angle} 60 60)`} />
        <circle cx="60" cy="60" r="5" fill="var(--fg)" />
        <text x="60" y="74" textAnchor="middle" fill="var(--fg)" fontSize="9">FEAR  ←  →  GREED</text>
      </svg>
      <p>{caption}</p>
    </div>
  </section>;
}

const pickArt = ['growth', 'bank', 'finance', 'business', 'data'];
export function StockPickCard({ pick, advanced = false, assetBase = defaultAssetBase }: { pick: StockPick; advanced?: boolean; assetBase?: string }) {
  const icon = pickArt[pick.ticker.length % pickArt.length]!;
  return <article className="si-pick">
    <div className="si-pick-head"><span className="si-ticker"><img src={asset(assetBase, icon)} alt="" /></span><div><h3>{pick.ticker}</h3><span className="si-muted">{pick.name}</span></div></div>
    <div className="si-pick-price"><span>₹{pick.price.toLocaleString('en-IN')}</span><span className="si-muted">{pick.confidence}% confidence</span></div>
    <span className="si-verdict" data-verdict={pick.verdict}>{pick.verdict === 'Buy' ? '↗' : pick.verdict === 'Avoid' ? '↘' : '•'} {pick.verdict}</span>
    <p>{pick.reason}</p>
    {advanced && pick.raw && <div className="si-advanced">{pick.raw}</div>}
  </article>;
}

export function WhenToBuySell({ bars, lines, from, levels, advanced = false }: { bars: Bar[]; lines: Lines; from: string; levels: StockChartLevels; advanced?: boolean }) {
  return <section id="market-trends" className="si-card si-chart-card">
    <h2>When to Buy &amp; Sell</h2>
    <div className="si-chart-wrap"><StockChart bars={bars} lines={lines} overlays={{ sma: false, ema: false, bands: false, rsi: false, macd: false }} from={from} tradeLevels={levels} /></div>
    <div className="si-legend"><span><i className="si-dot" />Buy zone · ₹{levels.buyZone?.[0]}–{levels.buyZone?.[1]}</span><span><i className="si-dot" data-type="target" />Target · ₹{levels.target}</span><span><i className="si-dot" data-type="exit" />Exit if below · ₹{levels.exit}</span></div>
    {advanced && <div className="si-advanced">Levels are illustrative price references included in this sample.</div>}
  </section>;
}

export function TradePlanCard({ entry, target, stop, advanced = false, assetBase = defaultAssetBase }: { entry: [number, number]; target: number; stop: number; advanced?: boolean; assetBase?: string }) {
  const mid = (entry[0] + entry[1]) / 2;
  const rr = riskReward(mid, target, stop);
  const shares = positionSizePerThousand(mid, stop);
  return <section className="si-card si-plan-card"><h2>Trade Plan</h2><div className="si-plan-list">
    <div className="si-plan-row"><img src={asset(assetBase, 'target')} alt="" /><span>Entry zone</span><strong>₹{entry[0]}–{entry[1]}</strong></div>
    <div className="si-plan-row"><img src={asset(assetBase, 'growth')} alt="" /><span>Target</span><strong className="si-positive">₹{target}</strong></div>
    <div className="si-plan-row"><img src={asset(assetBase, 'shield')} alt="" /><span>Stop / exit</span><strong className="si-negative">₹{stop}</strong></div>
    <hr className="si-rule" /><div className="si-plan-row"><img src={asset(assetBase, 'warning')} alt="" /><span>Risk / reward</span><strong>{rr === null ? 'Unavailable' : `1 : ${rr.toFixed(1)}`}</strong></div>
    {advanced && <div className="si-plan-row"><span>Shares per ₹1,000</span><strong>{shares ?? 'Unavailable'}</strong></div>}
  </div>{advanced && <p className="si-advanced">Position size assumes ₹10 planned risk per ₹1,000. Actual risk varies.</p>}</section>;
}

export function PaperPortfolioCard({ value, invested, holdings, advanced = false, assetBase = defaultAssetBase }: { value: number; invested: number; holdings: { ticker: string; value: number }[]; advanced?: boolean; assetBase?: string }) {
  const pnl = portfolioProfitLoss(value, invested);
  const displayedValue = useCountUp(value);
  return <section id="portfolio" className="si-card si-portfolio"><div className="si-portfolio-title"><h2>My Paper Portfolio</h2><img src={asset(assetBase, 'card')} alt="" /></div><div className="si-portfolio-value"><span className="si-muted">Current value</span><strong>₹{displayedValue.toLocaleString('en-IN')}</strong></div>
    <strong className={pnl >= 0 ? 'si-positive' : 'si-negative'}>{pnl >= 0 ? '+' : '−'}₹{Math.abs(pnl).toLocaleString('en-IN')} ({pnl >= 0 ? '+' : ''}{((pnl / invested) * 100).toFixed(1)}%)</strong>
    <ul id="watchlist" className="si-holdings">{holdings.map((item) => <li key={item.ticker}><span>{item.ticker}</span><strong>₹{item.value.toLocaleString('en-IN')}</strong></li>)}</ul>
    {advanced && <p className="si-advanced">Invested amount: ₹{invested.toLocaleString('en-IN')}</p>}
  </section>;
}

const whyArt = ['idea', 'document', 'growth', 'finance', 'warning'];
export function WhyThisStock({ items, assetBase = defaultAssetBase }: { items: { title: string; body: string }[]; assetBase?: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return <section className="si-card si-why"><h2>Why This Stock?</h2><div className="si-accordion">
    {items.map((item, index) => <div className="si-accordion-item" key={item.title}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}><img src={asset(assetBase, whyArt[index % whyArt.length]!)} alt="" /><span>{item.title}</span><span aria-hidden="true">{open === index ? '−' : '+'}</span></button>{open === index && <p>{item.body}</p>}</div>)}
  </div></section>;
}

export const pipelineSpec = {
  schemaVersion: '1.0', id: 'stock-pipeline', title: 'Illustrative research flow', topic: 'finance', layout: 'horizontal',
  nodes: [
    { id: 'news', kind: 'document', label: 'Market News' },
    { id: 'financial-data', kind: 'data', label: 'Financial Data' },
    { id: 'analysis', kind: 'ai', label: 'Analysis & AI' },
    { id: 'risk-check', kind: 'decision', label: 'Risk Check' },
    { id: 'pick', kind: 'goal', label: 'Stock Pick' },
  ],
  edges: [
    { id: 'news-data', from: 'news', to: 'financial-data' },
    { id: 'data-analysis', from: 'financial-data', to: 'analysis' },
    { id: 'analysis-risk', from: 'analysis', to: 'risk-check' },
    { id: 'risk-pick', from: 'risk-check', to: 'pick' },
  ],
  animation: { preset: 'step-reveal', loop: true, steps: [
    { caption: 'Example: public news can provide background for a research question.', nodes: ['news'], edges: [] },
    { caption: 'Example: financial data adds context about the company.', nodes: ['news', 'financial-data'], edges: ['news-data'], packets: [{ edge: 'news-data' }] },
    { caption: 'Example: analysis organizes the available information into a view.', nodes: ['news', 'financial-data', 'analysis'], edges: ['news-data', 'data-analysis'], packets: [{ edge: 'data-analysis' }] },
    { caption: 'Example: a risk check helps make uncertainties visible.', nodes: ['news', 'financial-data', 'analysis', 'risk-check'], edges: ['news-data', 'data-analysis', 'analysis-risk'], packets: [{ edge: 'analysis-risk' }] },
    { caption: 'Example: a sample pick summarizes the research flow, not a recommendation.', nodes: ['news', 'financial-data', 'analysis', 'risk-check', 'pick'], edges: ['news-data', 'data-analysis', 'analysis-risk', 'risk-pick'], packets: [{ edge: 'risk-pick' }], states: { pick: 'success' } },
  ] },
} as const;
// ClayFlow node art already resolves to /assets/clayflow/*.webp; its `assetBase` is only a host prefix
// (e.g. a CDN origin), so the stock-kit asset folder must not be forwarded or paths double up.
export function PipelineFlow({ clayflowAssetBase }: { clayflowAssetBase?: string } = {}) {
  return <section className="si-card si-pipeline"><h2>How we arrived at a pick</h2><p className="si-flow-example">Illustrative example · no live research is connected</p><ClayFlowDiagram spec={pipelineSpec} assetBase={clayflowAssetBase} className="si-flow-diagram" /></section>;
}

const glanceArt = ['growth', 'warning', 'bank', 'idea'];
export function MarketGlance({ items, assetBase = defaultAssetBase }: { items: { label: string; value: string }[]; assetBase?: string }) {
  return <section className="si-card"><h2>Market at a Glance</h2><div className="si-glance">{items.map((item, index) => <div className="si-glance-item" key={item.label}><img src={asset(assetBase, glanceArt[index % glanceArt.length]!)} alt="" /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></section>;
}

export function ModeSwitch({ mode, onChange }: { mode: 'beginner' | 'advanced'; onChange: (mode: 'beginner' | 'advanced') => void }) {
  return <div id="learn-explore" className="si-mode" data-advanced={mode === 'advanced'}><button type="button" aria-pressed={mode === 'beginner'} onClick={() => onChange('beginner')}>Beginner</button><button type="button" aria-pressed={mode === 'advanced'} onClick={() => onChange('advanced')}>Advanced</button></div>;
}
