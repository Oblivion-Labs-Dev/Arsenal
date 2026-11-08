import { cn } from '../lib/cn';
import { ChartDataTable } from './chart-data-table';
import { lineGeometry } from './chart-geometry';

export interface LineChartPoint {
  label: string;
  /** `null` leaves a gap in the line. */
  value: number | null;
}

export interface LineChartProps {
  points: LineChartPoint[];
  /** Accessible name and table caption. */
  label: string;
  /** Unit appended in tooltips and the table, e.g. "ms". */
  unit?: string;
  /** Fixed y range; defaults to 0..max. */
  min?: number;
  max?: number;
  color?: string;
  emptyText?: string;
  className?: string;
}

const FRAME = { left: 35, right: 665, top: 30, bottom: 160 };

/** Dependency-free single-series line chart with gaps for unknown values and a data table. */
export function LineChart({
  points,
  label,
  unit = '',
  min,
  max,
  color = 'var(--arsenal-accent)',
  emptyText = 'No data yet.',
  className,
}: LineChartProps) {
  const geo = lineGeometry(
    points.map((p) => p.value),
    FRAME,
    { min, max },
  );
  if (geo.points.length === 0) {
    return (
      <p className={cn('m-0 text-sm text-[var(--arsenal-text-secondary)]', className)}>
        {emptyText}
      </p>
    );
  }
  const fmt = (v: number) => `${Number(v.toFixed(2))}${unit}`;
  const first = points[0]?.label ?? '';
  const last = points[points.length - 1]?.label ?? '';
  return (
    <figure className={cn('m-0', className)}>
      <svg
        viewBox="0 0 700 195"
        className="h-auto w-full"
        role="img"
        aria-label={`${label}, ${first} to ${last}`}
      >
        {[geo.max, (geo.max + geo.min) / 2, geo.min].map((v, i) => {
          const y = FRAME.top + (i / 2) * (FRAME.bottom - FRAME.top);
          return (
            <g key={i}>
              <line
                x1={FRAME.left}
                x2={FRAME.right}
                y1={y}
                y2={y}
                stroke="var(--arsenal-border)"
                strokeWidth={1}
              />
              <text
                x={FRAME.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--arsenal-text-secondary)"
              >
                {fmt(v)}
              </text>
            </g>
          );
        })}
        {geo.segments.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {geo.points.map((p) => (
          <circle key={p.index} cx={p.x} cy={p.y} r={3.2} fill={color}>
            <title>{`${points[p.index]!.label}: ${fmt(p.value)}`}</title>
          </circle>
        ))}
        <text x={FRAME.left} y={185} fontSize={11} fill="var(--arsenal-text-secondary)">
          {first}
        </text>
        <text
          x={FRAME.right}
          y={185}
          textAnchor="end"
          fontSize={11}
          fill="var(--arsenal-text-secondary)"
        >
          {last}
        </text>
      </svg>
      <ChartDataTable
        caption={label}
        columns={['Point', `Value${unit ? ` (${unit})` : ''}`]}
        rows={points.map((p) => [p.label, p.value])}
      />
    </figure>
  );
}
