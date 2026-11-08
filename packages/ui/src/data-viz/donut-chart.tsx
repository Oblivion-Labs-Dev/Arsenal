import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { donutArcs } from './chart-geometry';

export interface DonutSegment {
  key: string;
  label: string;
  /** Size of the segment. `null`, zero and negative values draw no arc. */
  value: number | null;
  /** CSS colour; defaults cycle through the Arsenal accents. */
  color?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  /** Big figure in the middle, e.g. "68%". */
  centerValue?: ReactNode;
  /** Small text under the centre figure. */
  centerLabel?: string;
  /** Accessible name for the chart. */
  label: string;
  /** Makes legend rows buttons that report the chosen segment. */
  onSelectSegment?: (segment: DonutSegment) => void;
  /** Rendered size in px. */
  size?: number;
  className?: string;
}

export const DONUT_PALETTE = [
  'var(--arsenal-accent)',
  'var(--arsenal-accent-cyan)',
  'var(--arsenal-accent-violet)',
  'var(--arsenal-accent-amber)',
  'var(--arsenal-accent-blue)',
  'var(--arsenal-accent-gold)',
];

const R = 54;
const C = 2 * Math.PI * R;

const valueText = (v: number | null) => (v === null || !Number.isFinite(v) ? 'unknown' : String(v));

/** Ring of proportional segments with an optional centre figure and a legend. */
export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  label,
  onSelectSegment,
  size = 140,
  className,
}: DonutChartProps) {
  const arcs = donutArcs(
    segments.map((s) => s.value),
    C,
  );
  const colorOf = (i: number) => segments[i]?.color ?? DONUT_PALETTE[i % DONUT_PALETTE.length]!;
  const spoken = segments
    .map((s, i) => {
      const arc = arcs.find((a) => a.index === i);
      return `${s.label} ${valueText(s.value)}${arc ? ` (${Math.round(arc.share * 100)}%)` : ''}`;
    })
    .join(', ');
  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 140 140"
          width={size}
          height={size}
          role="img"
          aria-label={`${label}: ${spoken || 'no data'}`}
        >
          <circle
            cx={70}
            cy={70}
            r={R}
            fill="none"
            stroke="var(--arsenal-border)"
            strokeWidth={9}
          />
          {arcs.map((arc) => (
            <circle
              key={segments[arc.index]!.key}
              cx={70}
              cy={70}
              r={R}
              fill="none"
              stroke={colorOf(arc.index)}
              strokeWidth={9}
              strokeDasharray={`${arc.length} ${C - arc.length}`}
              strokeDashoffset={arc.offset}
              transform="rotate(-90 70 70)"
              style={{
                transition:
                  'stroke-dasharray var(--arsenal-duration-slow, 500ms) var(--arsenal-ease-out, ease-out), stroke-dashoffset var(--arsenal-duration-slow, 500ms) var(--arsenal-ease-out, ease-out)',
              }}
            />
          ))}
        </svg>
        {centerValue !== undefined || centerLabel ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex flex-col items-center justify-center text-center"
          >
            {centerValue !== undefined ? (
              <span className="text-lg font-semibold tabular-nums text-[var(--arsenal-text-primary)]">
                {centerValue}
              </span>
            ) : null}
            {centerLabel ? (
              <span className="text-xs text-[var(--arsenal-text-secondary)]">{centerLabel}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        {segments.map((segment, i) => {
          const body = (
            <>
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: colorOf(i) }}
              />
              <span className="text-[var(--arsenal-text-secondary)]">{segment.label}</span>
              <span className="ml-auto pl-3 font-semibold tabular-nums text-[var(--arsenal-text-primary)]">
                {valueText(segment.value)}
              </span>
            </>
          );
          return (
            <li key={segment.key}>
              {onSelectSegment ? (
                <button
                  type="button"
                  onClick={() => onSelectSegment(segment)}
                  className="flex w-full items-center gap-2 rounded-[var(--arsenal-radius-sm)] px-1.5 py-0.5 text-left hover:bg-[var(--arsenal-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--arsenal-accent)]"
                >
                  {body}
                </button>
              ) : (
                <span className="flex items-center gap-2 px-1.5 py-0.5">{body}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
