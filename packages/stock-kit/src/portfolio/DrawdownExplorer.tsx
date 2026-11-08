import { useMemo } from "react";
import { calculateDrawdown, type EquityPoint } from "./drawdown.js";
import "./portfolio.css";

export function DrawdownExplorer({ points }: { points: EquityPoint[] }) {
  const summary = useMemo(() => calculateDrawdown(points), [points]);
  if (!summary) return <p className="sk-empty">Not enough equity history to calculate drawdown.</p>;
  const width = 1000,
    height = 260,
    pad = 34;
  const min = Math.min(summary.worst.drawdownPct, 0);
  const x = (index: number) => pad + (index / (summary.points.length - 1)) * (width - pad * 2);
  const y = (value: number) => pad + ((0 - value) / (0 - min || 1)) * (height - pad * 2);
  const line = summary.points
    .map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.drawdownPct)}`)
    .join(" ");
  const area = `${line} L${x(summary.points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const worstIndex = summary.points.indexOf(summary.worst);
  const recoveryIndex = summary.recoveryDate
    ? summary.points.findIndex(
        (point, index) => index > worstIndex && point.date === summary.recoveryDate,
      )
    : -1;
  const description = `Drawdown chart with a worst decline of ${summary.worst.drawdownPct.toFixed(2)} percent on ${summary.worst.date}; ${summary.recoveryDate ? `recovered on ${summary.recoveryDate}` : "not recovered yet"}.`;
  return (
    <figure className="sk-drawdown" aria-label={description}>
      <div className="sk-drawdown-chart">
        <svg
          className="sk-drawdown-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={description}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <line
              key={fraction}
              className="sk-drawdown-grid"
              x1={pad}
              x2={width - pad}
              y1={pad + fraction * (height - pad * 2)}
              y2={pad + fraction * (height - pad * 2)}
            />
          ))}
          {recoveryIndex >= 0 && (
            <line
              className="sk-drawdown-recovery"
              x1={x(recoveryIndex)}
              x2={x(recoveryIndex)}
              y1={pad}
              y2={height - pad}
            />
          )}
          <path className="sk-drawdown-area" d={area} />
          <path className="sk-drawdown-line" d={line} />
          <circle
            className="sk-drawdown-worst"
            cx={x(worstIndex)}
            cy={y(summary.worst.drawdownPct)}
            r="5"
          />
        </svg>
      </div>
      <figcaption className="sk-drawdown-summary">
        <span>
          Worst drawdown: <strong>{summary.worst.drawdownPct.toFixed(2)}%</strong> on{" "}
          {summary.worst.date}
        </span>
        <span>Recovery: {summary.recoveryDate ?? "Not recovered yet"}</span>
      </figcaption>
      <table className="sk-visually-hidden">
        <caption>Drawdown values</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Drawdown</th>
          </tr>
        </thead>
        <tbody>
          {summary.points.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{point.drawdownPct.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
