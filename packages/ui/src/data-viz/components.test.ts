import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnimatedNumber, CountUp } from './animated-number';
import { ChartDataTable } from './chart-data-table';
import { DataRidgeBackground } from './data-ridge-background';
import { DeltaPill } from './delta-pill';
import { DistributionBars } from './distribution-bars';
import { DonutChart } from './donut-chart';
import { DrawdownChart } from './drawdown-chart';
import { LineChart } from './line-chart';
import { ScoreRing } from './score-ring';
import { SemiGauge } from './semi-gauge';
import { Sparkline } from './sparkline';
import { StackedBarChart } from './stacked-bar-chart';
import { TimeSeriesChart } from './time-series-chart';
import { Treemap } from './treemap';

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);

describe('AnimatedNumber', () => {
  it('speaks the settled value and hides the animated digits', () => {
    const out = html(createElement(AnimatedNumber, { value: 1234, suffix: '%' }));
    expect(out).toContain('aria-label="1,234%"');
    expect(out).toContain('aria-hidden="true"');
  });
  it('shows the placeholder for unknown, never 0', () => {
    const out = html(createElement(CountUp, { value: null }));
    expect(out).toContain('—');
    expect(out).toContain('aria-label="unknown"');
    expect(out).not.toContain('>0<');
  });
});

describe('DeltaPill', () => {
  it('labels direction in words', () => {
    const out = html(createElement(DeltaPill, { value: 0.012, label: 'Today' }));
    expect(out).toContain('data-tone="up"');
    expect(out).toMatch(/aria-label="Today: [^"]+"/);
  });
  it('says there is no data for null', () => {
    const out = html(createElement(DeltaPill, { value: null }));
    expect(out).toContain('no change data');
    expect(out).toContain('data-tone="muted"');
  });
});

describe('Sparkline', () => {
  it('renders an empty state with fewer than two points', () => {
    expect(html(createElement(Sparkline, { values: [1, null], label: 'Price' }))).toContain(
      'Not enough data for a trend.',
    );
  });
  it('renders a labelled line and lists unknown values in words', () => {
    const out = html(createElement(Sparkline, { values: [1, null, 3, 4], label: 'Price' }));
    expect(out).toContain('aria-label="Price"');
    expect(out).toContain('var(--arsenal-success)');
    expect(out).toContain('<li>unknown</li>');
  });
});

describe('ScoreRing and SemiGauge', () => {
  it('shows ? and an unknown label without a score', () => {
    const out = html(createElement(ScoreRing, { score: null, label: 'Quality' }));
    expect(out).toContain('aria-label="Quality: unknown"');
    expect(out).toContain('>?<');
  });
  it('speaks score with meaning', () => {
    const out = html(createElement(ScoreRing, { score: 72, label: 'Quality', meaning: 'strong' }));
    expect(out).toContain('aria-label="Quality: 72 of 100, strong"');
  });
  it('draws no needle when the gauge value is unknown', () => {
    const out = html(createElement(SemiGauge, { share: null, label: 'Mood' }));
    expect(out).toContain('aria-label="Mood: unknown"');
    expect(out).not.toContain('<line');
    expect(html(createElement(SemiGauge, { share: 0.7, label: 'Mood' }))).toContain('<line');
  });
});

describe('DataRidgeBackground', () => {
  it('captions real series data and keeps children', () => {
    const out = html(
      createElement(
        DataRidgeBackground,
        { series: { label: 'Value', from: 'Jan', to: 'Mar', values: [1, 2, 3] } },
        createElement('h1', null, 'Hello'),
      ),
    );
    expect(out).toContain('Value · Jan – Mar');
    expect(out).toContain('<h1>Hello</h1>');
  });
});

describe('Treemap', () => {
  const items = [
    { k: 'a', v: 0.02, w: 3 },
    { k: 'b', v: null, w: 1 },
  ];
  it('labels tiles and marks unknown values', () => {
    const out = html(
      createElement(Treemap<(typeof items)[number]>, {
        items,
        label: 'Sectors',
        getKey: (i) => i.k,
        getLabel: (i) => i.k.toUpperCase(),
        getWeight: (i) => i.w,
        getValue: (i) => i.v,
      }),
    );
    expect(out).toContain('aria-label="A: +2.00%"');
    expect(out).toContain('aria-label="B: unknown"');
    expect(out).toContain('data-unknown="true"');
  });
  it('has an empty state', () => {
    const out = html(
      createElement(Treemap<{ k: string }>, {
        items: [],
        label: 'Sectors',
        getKey: (i) => i.k,
        getLabel: (i) => i.k,
        getValue: () => null,
      }),
    );
    expect(out).toContain('Nothing to show yet.');
  });
});

describe('DrawdownChart', () => {
  it('explains a missing history', () => {
    expect(html(createElement(DrawdownChart, { points: [] }))).toContain(
      'Not enough equity history to calculate drawdown.',
    );
  });
  it('captions the worst drawdown and recovery state', () => {
    const out = html(
      createElement(DrawdownChart, {
        points: [
          { date: '2026-01-01', equity: 100 },
          { date: '2026-01-02', equity: 90 },
        ],
      }),
    );
    expect(out).toContain('Worst drawdown: -10.0% on 2026-01-02');
    expect(out).toContain('Not recovered yet');
  });
});

describe('TimeSeriesChart', () => {
  it('renders an accessible container without loading the library on the server', () => {
    const out = html(createElement(TimeSeriesChart, { series: [], label: 'Price history' }));
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Price history"');
  });
});

describe('DonutChart', () => {
  it('names each segment with its share and shows unknown values', () => {
    const out = html(
      createElement(DonutChart, {
        label: 'Mix',
        segments: [
          { key: 'a', label: 'A', value: 1 },
          { key: 'b', label: 'B', value: 3 },
          { key: 'c', label: 'C', value: null },
        ],
      }),
    );
    expect(out).toContain('aria-label="Mix: A 1 (25%), B 3 (75%), C unknown"');
    expect(out).toContain('>unknown<');
  });
  it('shows only the track when there is no data', () => {
    const out = html(createElement(DonutChart, { label: 'Mix', segments: [] }));
    expect(out).toContain('Mix: no data');
    expect(out.match(/<circle/g)).toHaveLength(1);
  });
});

describe('StackedBarChart, LineChart, DistributionBars', () => {
  it('stacked bars have pressed legend toggles and per-bar labels', () => {
    const out = html(
      createElement(StackedBarChart<'ok' | 'err'>, {
        label: 'Runs',
        series: [
          { key: 'ok', label: 'OK', color: 'var(--arsenal-success)' },
          { key: 'err', label: 'Failed', color: 'var(--arsenal-danger)' },
        ],
        rows: [{ label: 'Mon', values: { ok: 3, err: null } }],
      }),
    );
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain('aria-label="Mon: OK 3, Failed unknown; total 3"');
    expect(out).toContain('<details');
  });
  it('stacked bars and line chart show empty states', () => {
    expect(
      html(createElement(StackedBarChart<'a'>, { label: 'x', series: [], rows: [] })),
    ).toContain('No data yet.');
    expect(
      html(createElement(LineChart, { label: 'x', points: [{ label: 'a', value: null }] })),
    ).toContain('No data yet.');
  });
  it('line chart breaks at gaps and tables unknown values', () => {
    const out = html(
      createElement(LineChart, {
        label: 'Latency',
        unit: 'ms',
        points: [
          { label: 'a', value: 1 },
          { label: 'b', value: 2 },
          { label: 'c', value: null },
          { label: 'd', value: 4 },
        ],
      }),
    );
    expect(out.match(/<path/g)).toHaveLength(2);
    expect(out).toContain('<td>unknown</td>'.replace('<td>', '<td class="px-2 py-1">'));
  });
  it('distribution bars show unknown counts as unknown', () => {
    const out = html(
      createElement(DistributionBars, {
        label: 'Scores',
        buckets: [
          { key: 'a', label: 'Low', count: 1 },
          { key: 'b', label: 'High', count: null },
        ],
      }),
    );
    expect(out).toContain('width:100.00%');
    expect(out).toContain('>unknown<');
  });
});

describe('ChartDataTable', () => {
  it('prints unknown for null and non-finite cells', () => {
    const out = html(
      createElement(ChartDataTable, {
        caption: 'c',
        columns: ['k', 'v'],
        rows: [['x', Number.NaN]],
      }),
    );
    expect(out).toContain('unknown');
    expect(out).toContain('scope="row"');
  });
});
