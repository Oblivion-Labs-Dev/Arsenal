import { cn } from '../lib/cn';
import { ChartDataTable } from './chart-data-table';
import { calculateDrawdown, type EquityPoint } from './drawdown';

export interface DrawdownChartProps {
  /** Equity history in date order. */
  points: EquityPoint[];
  /** Accessible name. */
  label?: string;
  /** Formats the dates shown in the caption and table. */
  formatDate?: (date: string) => string;
  className?: string;
}

const W = 1000;
const H = 260;
const PAD = 34;
const GRID = [0, 0.25, 0.5, 0.75, 1];

/** Pure layout for the drawdown chart: paths and marker positions in a 1000×260 viewBox. */
export function drawdownChartGeometry(points: EquityPoint[]) {
  const summary = calculateDrawdown(points);
  if (!summary) return null;
  const n = summary.points.length;
  const low = Math.min(-0.0001, summary.worst.drawdownPct);
  const x = (i: number) => Number((PAD + (i / (n - 1)) * (W - PAD * 2)).toFixed(2));
  const y = (pct: number) => Number((PAD + (pct / low) * (H - PAD * 2)).toFixed(2));
  const coords = summary.points.map((p, i) => ({ x: x(i), y: y(p.drawdownPct) }));
  const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x},${c.y}`).join(' ');
  const area = `${line} L${coords[n - 1]!.x},${PAD} L${coords[0]!.x},${PAD} Z`;
  const worstIndex = summary.points.indexOf(summary.worst);
  const recoveryIndex =
    summary.recoveryDate === null || summary.worst.drawdownPct === 0
      ? -1
      : summary.points.findIndex((p, i) => i > worstIndex && p.date === summary.recoveryDate);
  return {
    summary,
    line,
    area,
    worst: coords[worstIndex]!,
    recoveryX: recoveryIndex >= 0 ? coords[recoveryIndex]!.x : null,
    grid: GRID.map((f) => ({ f, y: Number((PAD + f * (H - PAD * 2)).toFixed(2)), pct: f * low })),
  };
}

/** Underwater chart: how far equity sat below its running high, with the worst trough marked. */
export function DrawdownChart({
  points,
  label = 'Drawdown',
  formatDate = (d) => d,
  className,
}: DrawdownChartProps) {
  const geo = drawdownChartGeometry(points);
  if (!geo) {
    return (
      <p className={cn('m-0 text-sm text-[var(--arsenal-text-secondary)]', className)}>
        Not enough equity history to calculate drawdown.
      </p>
    );
  }
  const { summary } = geo;
  const worstText = `Worst drawdown: ${summary.worst.drawdownPct.toFixed(1)}% on ${formatDate(summary.worst.date)}`;
  const recoveryText = summary.recoveryDate
    ? `Recovery: ${formatDate(summary.recoveryDate)}`
    : 'Not recovered yet';
  return (
    <figure className={cn('m-0 flex flex-col gap-2', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${label}. ${worstText}. ${recoveryText}.`}
      >
        {geo.grid.map((g) => (
          <g key={g.f}>
            <line
              x1={PAD}
              x2={W - PAD}
              y1={g.y}
              y2={g.y}
              stroke="var(--arsenal-border)"
              strokeWidth={1}
            />
            <text x={4} y={g.y + 4} fontSize={11} fill="var(--arsenal-text-secondary)">
              {`${g.pct.toFixed(0)}%`}
            </text>
          </g>
        ))}
        {geo.recoveryX !== null ? (
          <line
            x1={geo.recoveryX}
            x2={geo.recoveryX}
            y1={PAD}
            y2={H - PAD}
            stroke="var(--arsenal-success)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        ) : null}
        <path d={geo.area} fill="var(--arsenal-danger)" opacity={0.14} />
        <path
          d={geo.line}
          fill="none"
          stroke="var(--arsenal-danger)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <circle
          cx={geo.worst.x}
          cy={geo.worst.y}
          r={5}
          fill="var(--arsenal-danger)"
          stroke="var(--arsenal-surface)"
          strokeWidth={2}
        />
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 text-sm text-[var(--arsenal-text-secondary)]">
        <span>{worstText}</span>
        <span>{recoveryText}</span>
      </figcaption>
      <ChartDataTable
        caption={label}
        columns={['Date', 'Equity', 'Drawdown %']}
        rows={summary.points.map((p) => [formatDate(p.date), p.equity, p.drawdownPct.toFixed(2)])}
      />
    </figure>
  );
}
