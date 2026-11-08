import { useEffect, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi, SeriesType, Time } from 'lightweight-charts';
import { cn } from '../lib/cn';
import { readChartColors, toRgba } from './chart-colors';

/** ISO date ("2026-01-31") or a UTC timestamp in seconds. */
export type TimeSeriesTime = string | number;

export interface TimeSeriesValuePoint {
  time: TimeSeriesTime;
  value: number;
  /** Per-point colour (histograms), as a CSS colour or `--arsenal-*` token name. */
  color?: string;
}

export interface TimeSeriesCandlePoint {
  time: TimeSeriesTime;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface SeriesBase {
  /** Stable id, used for markers and price lines. */
  id: string;
  /** `--arsenal-*` token name (e.g. "--arsenal-accent") or a CSS colour. */
  color?: string;
  /** 0 is the main pane; higher numbers stack panes below it. */
  pane?: number;
}

export type TimeSeriesSpec =
  | (SeriesBase & { type: 'line' | 'area' | 'histogram'; data: TimeSeriesValuePoint[] })
  | (SeriesBase & { type: 'candlestick'; data: TimeSeriesCandlePoint[] });

export interface TimeSeriesPriceLine {
  seriesId: string;
  price: number;
  title?: string;
  color?: string;
  dashed?: boolean;
}

export interface TimeSeriesMarker {
  seriesId: string;
  time: TimeSeriesTime;
  position?: 'aboveBar' | 'belowBar' | 'inBar';
  shape?: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  text?: string;
  color?: string;
}

export interface TimeSeriesChartProps {
  series: TimeSeriesSpec[];
  priceLines?: TimeSeriesPriceLine[];
  markers?: TimeSeriesMarker[];
  /** Accessible description of what the chart shows. */
  label: string;
  /** Fit all data into view after drawing. */
  fitContent?: boolean;
  /** Height share of the main pane relative to each extra pane. */
  mainPaneStretch?: number;
  className?: string;
}

const BASE_TOKENS = {
  muted: { token: '--arsenal-text-secondary', fallback: 'rgb(120,120,130)' },
  grid: { token: '--arsenal-border', fallback: 'rgba(127,127,127,0.18)' },
  accent: { token: '--arsenal-accent', fallback: 'rgb(99,102,241)' },
  success: { token: '--arsenal-success', fallback: 'rgb(34,197,94)' },
  danger: { token: '--arsenal-danger', fallback: 'rgb(239,68,68)' },
  violet: { token: '--arsenal-accent-violet', fallback: 'rgb(139,92,246)' },
};

/** Resolve a token name or CSS colour as it applies inside `scope`. */
export function resolveChartColor(scope: HTMLElement, color: string, fallback: string): string {
  const token = color.startsWith('--') ? color : null;
  if (token) return readChartColors(scope, { c: { token, fallback } }).c;
  return readChartColors(scope, { c: { token: '--arsenal-unset-color', fallback: color } }).c;
}

const asTime = (t: TimeSeriesTime) => t as Time;

/**
 * Interactive financial time-series chart on TradingView Lightweight Charts, loaded lazily so pages
 * without a chart never pay for it. Requires the optional `lightweight-charts` peer (v5). Colours
 * follow `--arsenal-*` tokens and redraw on theme change. The attribution logo stays on (license).
 */
export function TimeSeriesChart({
  series,
  priceLines = [],
  markers = [],
  label,
  fitContent = true,
  mainPaneStretch = 4,
  className,
}: TimeSeriesChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    let disposed = false;
    let chart: IChartApi | null = null;
    let library: typeof import('lightweight-charts') | null = null;

    const redraw = () => {
      if (disposed || !library) return;
      chart?.remove();
      const lc = library;
      const base = readChartColors(el, BASE_TOKENS);
      const color = (c: string | undefined, fallback: string) =>
        c ? resolveChartColor(el, c, fallback) : fallback;
      const active = lc.createChart(el, {
        autoSize: true,
        layout: {
          background: { color: 'transparent' },
          textColor: base.muted,
          attributionLogo: true,
        },
        grid: { vertLines: { color: base.grid }, horzLines: { color: base.grid } },
        rightPriceScale: { borderColor: base.grid },
        timeScale: { borderColor: base.grid },
        crosshair: {
          mode: lc.CrosshairMode.Magnet,
          horzLine: { labelBackgroundColor: base.violet },
        },
      });
      chart = active;
      const byId = new Map<string, ISeriesApi<SeriesType>>();
      for (const spec of series) {
        const pane = spec.pane ?? 0;
        if (spec.type === 'candlestick') {
          const s = active.addSeries(
            lc.CandlestickSeries,
            {
              upColor: base.success,
              downColor: base.danger,
              wickUpColor: base.success,
              wickDownColor: base.danger,
              borderVisible: false,
            },
            pane,
          );
          s.setData(spec.data.map((d) => ({ ...d, time: asTime(d.time) })));
          byId.set(spec.id, s);
          continue;
        }
        const main = color(spec.color, base.accent);
        const points = spec.data
          .filter((d) => Number.isFinite(d.value))
          .map((d) => ({
            time: asTime(d.time),
            value: d.value,
            ...(d.color ? { color: color(d.color, main) } : {}),
          }));
        if (spec.type === 'line') {
          const s = active.addSeries(lc.LineSeries, { color: main, lineWidth: 2 }, pane);
          s.setData(points);
          byId.set(spec.id, s);
        } else if (spec.type === 'area') {
          const s = active.addSeries(
            lc.AreaSeries,
            {
              lineColor: main,
              topColor: toRgba(main, 0.28) ?? main,
              bottomColor: toRgba(main, 0) ?? 'transparent',
              lineWidth: 2,
            },
            pane,
          );
          s.setData(points.map(({ time, value }) => ({ time, value })));
          byId.set(spec.id, s);
        } else {
          const s = active.addSeries(
            lc.HistogramSeries,
            { color: toRgba(main, 0.6) ?? main, priceLineVisible: false },
            pane,
          );
          s.setData(points);
          byId.set(spec.id, s);
        }
      }
      for (const line of priceLines) {
        const target = byId.get(line.seriesId);
        if (!target || !Number.isFinite(line.price)) continue;
        target.createPriceLine({
          price: line.price,
          color: color(line.color, base.violet),
          lineWidth: 1,
          lineStyle: line.dashed === false ? lc.LineStyle.Solid : lc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: line.title ?? '',
        });
      }
      const grouped = new Map<string, TimeSeriesMarker[]>();
      for (const m of markers) grouped.set(m.seriesId, [...(grouped.get(m.seriesId) ?? []), m]);
      for (const [id, list] of grouped) {
        const target = byId.get(id);
        if (!target) continue;
        lc.createSeriesMarkers(
          target,
          list.map((m) => ({
            time: asTime(m.time),
            position: m.position ?? 'aboveBar',
            shape: m.shape ?? 'circle',
            color: color(m.color, base.accent),
            text: m.text ?? '',
          })),
        );
      }
      active.panes().forEach((p, i) => p.setStretchFactor(i === 0 ? mainPaneStretch : 1));
      if (fitContent) active.timeScale().fitContent();
    };

    import('lightweight-charts')
      .then((lc) => {
        if (disposed) return;
        library = lc;
        redraw();
      })
      .catch((cause: unknown) => {
        // Never fail silently: the peer dependency is optional, so say so on screen and in the console.
        console.error('TimeSeriesChart: could not load lightweight-charts', cause);
        if (!disposed)
          setError('Chart unavailable: the lightweight-charts package is not installed.');
      });
    const themeObserver = new MutationObserver(redraw);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', redraw);
    return () => {
      disposed = true;
      themeObserver.disconnect();
      scheme.removeEventListener('change', redraw);
      chart?.remove();
      chart = null;
    };
  }, [series, priceLines, markers, fitContent, mainPaneStretch]);

  return (
    <div className={cn('relative h-72 w-full', className)}>
      <div ref={box} role="img" aria-label={label} className="absolute inset-0" />
      {error ? (
        <p
          role="alert"
          className="absolute inset-0 m-0 grid place-items-center text-sm text-[var(--arsenal-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
