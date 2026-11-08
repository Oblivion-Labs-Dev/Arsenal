import type { Bar, Lines } from '@arsenal/stock-kit';
import type { StockIndex, StockPick } from '@arsenal/stock-kit';

export const sampleIndices: StockIndex[] = [
  {
    name: 'Example Index A',
    value: '12,345',
    change: 0.84,
    sparkline: [2, 4, 3, 7, 5, 9, 8, 12, 10],
  },
  {
    name: 'Example Index B',
    value: '8,210',
    change: 0.79,
    sparkline: [3, 4, 2, 6, 8, 6, 10, 9, 13],
  },
  {
    name: 'Example Bank Index',
    value: '5,520',
    change: 1.02,
    sparkline: [2, 3, 6, 4, 8, 7, 11, 9, 14],
  },
];

export const samplePicks: StockPick[] = [
  {
    ticker: 'LUMA',
    name: 'Luma Systems (sample)',
    price: 158,
    verdict: 'Buy',
    confidence: 72,
    reason: 'Example only: steady demand and improving margins.',
    raw: 'Sample trend score: 0.72 · volatility: moderate',
  },
  {
    ticker: 'TERRA',
    name: 'Terra Finance (sample)',
    price: 164,
    verdict: 'Buy',
    confidence: 68,
    reason: 'Example only: resilient deposits and measured growth.',
    raw: 'Sample trend score: 0.68 · volatility: low',
  },
  {
    ticker: 'NOVA',
    name: 'Nova Industries (sample)',
    price: 298,
    verdict: 'Watch',
    confidence: 54,
    reason: 'Example only: monitor the next set of business updates.',
    raw: 'Sample trend score: 0.54 · volatility: moderate',
  },
];

export const sampleLevels = { buyZone: [154, 157] as [number, number], target: 168, exit: 148 };
const start = new Date('2026-08-15T00:00:00Z');
export const sampleBars: Bar[] = Array.from({ length: 34 }, (_, index) => {
  const date = new Date(start);
  date.setUTCDate(start.getUTCDate() + index);
  const close = 150 + index * 0.4 + Math.sin(index * 0.8) * 2.4;
  const open = close - Math.sin(index * 1.2) * 1.5;
  return {
    date: date.toISOString().slice(0, 10),
    open,
    close,
    high: Math.max(open, close) + 1.6,
    low: Math.min(open, close) - 1.6,
    volume: 30000 + index * 1200,
  };
});
const points = (value: (bar: Bar, index: number) => number) =>
  sampleBars.map((bar, index) => ({ date: bar.date, value: value(bar, index) }));
export const sampleLines: Lines = {
  sma50: points((bar) => bar.close - 1),
  sma200: points((bar) => bar.close - 2),
  ema20: points((bar) => bar.close - 0.5),
  bbUpper: points((bar) => bar.close + 3),
  bbLower: points((bar) => bar.close - 3),
  rsi14: points((_, index) => 45 + Math.sin(index) * 12),
  macd: points((_, index) => Math.sin(index / 3)),
  macdSignal: points((_, index) => Math.sin(index / 3) - 0.2),
  macdHistogram: points((_, index) => Math.cos(index / 3) * 0.3),
};

export const portfolio = {
  value: 108430,
  invested: 100000,
  holdings: [
    { ticker: 'LUMA', value: 32500 },
    { ticker: 'TERRA', value: 28400 },
    { ticker: 'NOVA', value: 21530 },
  ],
};
export const mood = {
  value: 63,
  label: 'Cautiously positive',
  caption: 'More signals are optimistic than worried in this sample.',
};
export const reasons = [
  {
    title: 'The big picture',
    body: 'Illustrative example: the business outlook appears steady in this sample view.',
  },
  {
    title: 'Key developments',
    body: 'No live headlines are connected. This sample section represents where reviewed updates would appear.',
  },
  {
    title: 'Historical pattern',
    body: 'The example chart shows a gradual upward path with short pauses.',
  },
  {
    title: 'Risks to watch',
    body: 'Market swings, changing demand and company execution can affect outcomes.',
  },
];
export const glance = [
  { label: 'Market breadth', value: '58% advancing' },
  { label: 'Volatility', value: 'Moderate' },
  { label: 'Top sector', value: 'IT' },
  { label: 'Watch next', value: 'Quarterly results' },
];
