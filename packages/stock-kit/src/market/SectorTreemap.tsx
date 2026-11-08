import { useEffect, useMemo, useRef, useState } from "react";
import { rectToPercent, squarify } from "./treemap.js";

const MAP_W = 100;
const MAP_H = 34;

export interface SectorCell {
  symbol: string;
  name: string;
  change: number | null;
  weight?: number;
}

export interface SectorTreemapProps {
  cells: SectorCell[];
  asOf: string | null;
  onSelect?: (symbol: string) => void;
}

const signedPercent = (change: number) => `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}%`;

export function SectorTreemap({ cells, asOf, onSelect }: SectorTreemapProps) {
  const figure = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = figure.current;
    if (!el || !("IntersectionObserver" in window)) {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) =>
        setActive(Boolean(entry?.isIntersecting && document.visibilityState === "visible")),
      { threshold: 0.01 },
    );
    const onVisibility = () =>
      setActive(
        document.visibilityState === "visible" &&
          el.getBoundingClientRect().bottom > 0 &&
          el.getBoundingClientRect().top < window.innerHeight,
      );
    observer.observe(el);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const rects = useMemo(() => squarify(cells, MAP_W, MAP_H), [cells]);
  const moveFocus = (index: number, key: string) => {
    const current = rects[index];
    if (!current) return;
    const cx = current.x + current.width / 2;
    const cy = current.y + current.height / 2;
    const candidates = rects.flatMap((rect, nextIndex) => {
      if (nextIndex === index || !cells[nextIndex]) return [];
      const dx = rect.x + rect.width / 2 - cx;
      const dy = rect.y + rect.height / 2 - cy;
      const primary =
        key === "ArrowRight" ? dx : key === "ArrowLeft" ? -dx : key === "ArrowDown" ? dy : -dy;
      const secondary =
        key.startsWith("ArrowLeft") || key.startsWith("ArrowRight") ? Math.abs(dy) : Math.abs(dx);
      return primary > 0 ? [{ nextIndex, score: primary + secondary * 2 }] : [];
    });
    candidates.sort((a, b) => a.score - b.score);
    if (candidates[0]) buttons.current[candidates[0].nextIndex]?.focus();
  };
  const rising = cells.filter((cell) => cell.change !== null && cell.change > 0).length;
  const falling = cells.filter((cell) => cell.change !== null && cell.change < 0).length;

  return (
    <figure
      ref={figure}
      className="sk-market-treemap"
      data-active={active}
      aria-label={`Sector performance treemap, ${cells.length} sectors; ${rising} up and ${falling} down${asOf ? ` as of ${asOf}` : ""}.`}
    >
      {cells.length ? (
        <div
          className="sk-sector-map"
          role="group"
          aria-label="Sector performance; use arrow keys to move between sectors"
        >
          {cells.map((cell, index) => {
            const rect = rects[index]!;
            const change = cell.change;
            // Capped at 55% so cell text keeps 4.5:1 contrast in both themes at the largest moves.
            const intensity = change === null ? 0 : Math.min(1, Math.abs(change) / 0.03) * 55;
            const color =
              change === null
                ? "var(--si-surface-2)"
                : change < 0
                  ? `color-mix(in srgb, var(--err) ${intensity}%, var(--si-surface-2))`
                  : `color-mix(in srgb, var(--ok) ${intensity}%, var(--si-surface-2))`;
            // Thresholds are in percent of the container on each axis.
            const wPct = (rect.width / MAP_W) * 100;
            const hPct = (rect.height / MAP_H) * 100;
            const showDetail = wPct >= 12 && hPct >= 20;
            const showName = wPct >= 7 && hPct >= 10;
            const direction =
              change === null
                ? "no move data"
                : change > 0
                  ? `up ${signedPercent(change)} today`
                  : change < 0
                    ? `down ${signedPercent(change)} today`
                    : "unchanged today";
            const label = `${cell.name} (${cell.symbol}), ${direction}`;
            return (
              <button
                key={cell.symbol}
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                type="button"
                className={`sk-sector-cell${change === null ? " is-unknown" : ""}`}
                style={
                  {
                    ...rectToPercent(rect, MAP_W, MAP_H),
                    backgroundColor: color,
                    animationDelay: `${Math.min(index, 5) * 40}ms`,
                  } as React.CSSProperties
                }
                aria-label={label}
                title={label}
                onClick={() => onSelect?.(cell.symbol)}
                onKeyDown={(event) => {
                  if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) {
                    event.preventDefault();
                    moveFocus(index, event.key);
                  }
                }}
              >
                {showDetail ? (
                  <>
                    <span className="sk-sector-symbol">{cell.name}</span>
                    <span className="sk-sector-change">
                      {change === null ? "no move data" : signedPercent(change)}
                    </span>
                  </>
                ) : showName && change === null ? (
                  <>
                    <span className="sk-sector-symbol">{cell.name}</span>
                    <span className="sk-sector-unknown">no move data</span>
                  </>
                ) : (
                  <span className="sk-sector-symbol">{cell.name}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="sk-market-empty">No sector data is available.</p>
      )}
      <figcaption className="sk-market-caption">
        <div className="sk-treemap-legend" aria-label="Daily move color scale: losses to gains">
          <span>−3%</span>
          <i aria-hidden="true" />
          <span>0%</span>
          <i aria-hidden="true" />
          <span>+3%</span>
          <span className="sk-treemap-unknown-key">Hatched: no move data</span>
        </div>
        <span>{asOf ? `As of ${asOf}` : "As of unknown"}</span>
      </figcaption>
      <table className="sk-market-sr-only">
        <caption>Sector performance data</caption>
        <thead>
          <tr>
            <th>Sector</th>
            <th>Symbol</th>
            <th>Daily move</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((cell) => (
            <tr key={cell.symbol}>
              <td>{cell.name}</td>
              <td>{cell.symbol}</td>
              <td>{cell.change === null ? "No move data" : signedPercent(cell.change)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
