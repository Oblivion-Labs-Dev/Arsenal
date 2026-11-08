import { useEffect, useRef } from "react";
import { readChartColors, toRgba } from "./market/chart-colors.js";

// The Analyze chart (#940): candles, volume, moving averages and Bollinger Bands on the price pane,
// RSI and MACD in their own panes, all from lines the API computed (the UI draws, it does not
// calculate). TradingView Lightweight Charts (Apache-2.0) is imported here only, so its code loads
// with this view; its required attribution link stays on the chart.

export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface Point {
  date: string;
  value: number;
}
export interface Lines {
  sma50: Point[];
  sma200: Point[];
  ema20: Point[];
  bbUpper: Point[];
  bbLower: Point[];
  rsi14: Point[];
  macd: Point[];
  macdSignal: Point[];
  macdHistogram: Point[];
}
export interface Overlays {
  sma: boolean;
  ema: boolean;
  bands: boolean;
  rsi: boolean;
  macd: boolean;
}

/** Token color at a given opacity, as rgba() the chart library can parse. */
const translucent = (color: string, opacity = 0.35) => toRgba(color, opacity) ?? color;

/** Chart colors resolved from the tokens in effect at the chart; hex only as a last resort. */
const CHART_TOKENS = {
  fg: { token: "--fg", fallback: "#272d29" },
  muted: { token: "--muted", fallback: "#586056" },
  line: { token: "--line", fallback: "#d8d6cb" },
  ok: { token: "--ok", fallback: "#336345" },
  err: { token: "--err", fallback: "#a62c28" },
  accent: { token: "--accent", fallback: "#80502e" },
  warn: { token: "--warn", fallback: "#95672a" },
  violet: { token: "--si-violet", fallback: "#80502e" },
};

export interface StockChartLevels {
  buyZone?: [number, number];
  target?: number;
  exit?: number;
}

export interface StockChartEvent {
  date: string;
  kind: "filing" | "news";
  label: string;
}

export interface StockChartProps {
  bars: Bar[];
  lines: Lines;
  overlays: Overlays;
  /** First date shown; earlier history still feeds the lines. */
  from: string;
  /** Support/resistance reference levels, drawn as dotted price lines. */
  levels?: { price: number; label: string }[];
  /** The call's trade levels: a shaded buy zone and Target/Exit lines. Absent levels draw nothing. */
  tradeLevels?: StockChartLevels;
  /** Filing and news dates already stored for this company. */
  events?: StockChartEvent[];
}

const NO_LEVELS: { price: number; label: string }[] = [];

export function StockChart({
  bars,
  lines,
  overlays,
  from,
  levels = NO_LEVELS,
  tradeLevels,
  events = [],
}: StockChartProps) {
  const box = useRef<HTMLDivElement>(null);
  const glide = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let disposed = false;
    let chart: import("lightweight-charts").IChartApi | null = null;
    let library: typeof import("lightweight-charts") | null = null;
    const redraw = () => {
      if (disposed || !library) return;
      chart?.remove();
      const lc = library;
      const { fg, muted, line, ok, err, accent, warn, violet } = readChartColors(el, CHART_TOKENS);
      chart = lc.createChart(el, {
        autoSize: true,
        layout: { background: { color: "transparent" }, textColor: muted, attributionLogo: true },
        grid: { vertLines: { color: line }, horzLines: { color: line } },
        rightPriceScale: { borderColor: line },
        timeScale: { borderColor: line },
        crosshair: {
          // The data readout snaps to the nearest actual price; the vertical guide is eased below.
          mode: lc.CrosshairMode.Magnet,
          vertLine: { visible: false },
          horzLine: { labelBackgroundColor: violet },
        },
      });
      const activeChart = chart;
      const shown = <T extends { date: string }>(xs: T[]) => xs.filter((x) => x.date >= from);
      const asLine = (xs: Point[]) => shown(xs).map((p) => ({ time: p.date, value: p.value }));

      if (tradeLevels?.buyZone) {
        const [first, second] = tradeLevels.buyZone;
        const low = Math.min(first, second);
        const high = Math.max(first, second);
        const band = activeChart.addSeries(lc.BaselineSeries, {
          baseValue: { type: "price", price: low },
          topLineColor: "transparent",
          bottomLineColor: "transparent",
          topFillColor1: translucent(violet, 0.18),
          topFillColor2: translucent(violet, 0.18),
          bottomFillColor1: "transparent",
          bottomFillColor2: "transparent",
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        band.setData(shown(bars).map((bar) => ({ time: bar.date, value: high })));
        const price = activeChart.addSeries(lc.LineSeries, {
          color: translucent(violet, 0.8),
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        price.setData(shown(bars).map((bar) => ({ time: bar.date, value: low })));
        price.createPriceLine({
          price: low,
          color: violet,
          lineStyle: lc.LineStyle.Dashed,
          lineWidth: 1,
          axisLabelVisible: true,
          title: "Buy zone",
        });
      }

      const candles = activeChart.addSeries(lc.CandlestickSeries, {
        upColor: ok,
        downColor: err,
        borderUpColor: ok,
        borderDownColor: err,
        wickUpColor: ok,
        wickDownColor: err,
      });
      candles.setData(
        shown(bars).map((b) => ({
          time: b.date,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })),
      );
      const eventDates = new Map<string, StockChartEvent[]>();
      for (const event of events) {
        if (!shown(bars).some((bar) => bar.date === event.date)) continue;
        eventDates.set(event.date, [...(eventDates.get(event.date) ?? []), event]);
      }
      if (eventDates.size > 0) {
        lc.createSeriesMarkers(
          candles,
          [...eventDates].map(([date, dayEvents]) => ({
            time: date,
            position: "aboveBar" as const,
            color: dayEvents.some((event) => event.kind === "filing") ? warn : violet,
            shape: "circle" as const,
            text: dayEvents.map((event) => (event.kind === "filing" ? "F" : "N")).join("·"),
            size: 1,
          })),
        );
      }

      for (const l of levels)
        candles.createPriceLine({
          price: l.price,
          color: muted,
          lineStyle: lc.LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: true,
          title: l.label,
        });
      if (tradeLevels?.target !== undefined)
        candles.createPriceLine({
          price: tradeLevels.target,
          color: ok,
          lineStyle: lc.LineStyle.Dashed,
          lineWidth: 1,
          axisLabelVisible: true,
          title: "Target",
        });
      if (tradeLevels?.exit !== undefined)
        candles.createPriceLine({
          price: tradeLevels.exit,
          color: err,
          lineStyle: lc.LineStyle.Dashed,
          lineWidth: 1,
          axisLabelVisible: true,
          title: "Exit",
        });

      const volume = activeChart.addSeries(lc.HistogramSeries, {
        priceScaleId: "volume",
        priceFormat: { type: "volume" },
      });
      volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volume.setData(
        shown(bars).map((b, i, all) => ({
          time: b.date,
          value: b.volume,
          // Lightweight Charts parses colors itself; use token-derived RGBA for translucency.
          color: translucent(i > 0 && b.close < all[i - 1]!.close ? err : ok),
        })),
      );

      const overlay = (data: Point[], color: string, dashed = false) =>
        activeChart
          .addSeries(lc.LineSeries, {
            color,
            lineWidth: 1,
            lineStyle: dashed ? lc.LineStyle.Dashed : lc.LineStyle.Solid,
            priceLineVisible: false,
            lastValueVisible: false,
          })
          .setData(asLine(data));
      if (overlays.sma) {
        overlay(lines.sma50, accent);
        overlay(lines.sma200, fg);
      }
      if (overlays.ema) overlay(lines.ema20, warn);
      if (overlays.bands) {
        overlay(lines.bbUpper, muted, true);
        overlay(lines.bbLower, muted, true);
      }

      let pane = 1;
      if (overlays.rsi) {
        const rsi = activeChart.addSeries(
          lc.LineSeries,
          { color: accent, lineWidth: 1, priceLineVisible: false },
          pane,
        );
        rsi.setData(asLine(lines.rsi14));
        rsi.createPriceLine({
          price: 70,
          color: err,
          lineStyle: lc.LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: false,
          title: "70",
        });
        rsi.createPriceLine({
          price: 30,
          color: ok,
          lineStyle: lc.LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: false,
          title: "30",
        });
        pane++;
      }
      if (overlays.macd) {
        activeChart.addSeries(lc.HistogramSeries, { priceLineVisible: false }, pane).setData(
          shown(lines.macdHistogram).map((p) => ({
            time: p.date,
            value: p.value,
            color: p.value >= 0 ? ok : err,
          })),
        );
        activeChart
          .addSeries(lc.LineSeries, { color: fg, lineWidth: 1, priceLineVisible: false }, pane)
          .setData(asLine(lines.macd));
        activeChart
          .addSeries(lc.LineSeries, { color: accent, lineWidth: 1, priceLineVisible: false }, pane)
          .setData(asLine(lines.macdSignal));
      }
      const panes = activeChart.panes();
      // Price gets most of the height; each indicator pane a fixed share of the rest.
      panes.forEach((p, i) => p.setStretchFactor(i === 0 ? 4 : 1));
      activeChart.timeScale().fitContent();
    };
    const onPointerMove = (event: PointerEvent) => {
      const guide = glide.current;
      const activeChart = chart;
      if (!guide || !activeChart) return;
      const bounds = el.getBoundingClientRect();
      const pointerX = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
      const timeScale = activeChart.timeScale();
      let x = pointerX;
      let nearest = 14;
      for (const item of events) {
        const markerX = timeScale.timeToCoordinate(item.date);
        if (markerX === null) continue;
        const distance = Math.abs(markerX - pointerX);
        if (distance < nearest) {
          nearest = distance;
          x = markerX;
        }
      }
      guide.style.transform = `translate3d(${x}px, 0, 0)`;
      guide.style.opacity = "1";
    };
    const onPointerLeave = () => {
      if (glide.current) glide.current.style.opacity = "0";
    };
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);
    void import("lightweight-charts").then((lc) => {
      if (disposed) return;
      library = lc;
      redraw();
    });
    const themeObserver = new MutationObserver(redraw);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    colorScheme.addEventListener("change", redraw);
    return () => {
      disposed = true;
      themeObserver.disconnect();
      colorScheme.removeEventListener("change", redraw);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      chart?.remove();
    };
  }, [bars, lines, overlays, from, levels, tradeLevels, events]);

  return (
    <div ref={box} className="si-chart-canvas" role="img" aria-label="Price chart with indicators">
      <span className="si-crosshair-glide" ref={glide} aria-hidden="true" />
    </div>
  );
}
