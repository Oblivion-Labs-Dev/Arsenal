import { useEffect, useId, useState } from 'react';
import { shouldReduceMotion } from '@arsenal/motion';
import { cn } from '../lib/cn';
import { sparkGeometry } from './math';

export type SparklineTone = 'auto' | 'accent' | 'info';

export interface SparklineProps {
  /** Series in time order. `null` leaves a gap instead of inventing a point. */
  values: (number | null)[];
  width?: number;
  height?: number;
  /** `auto` colours by direction: success when the last value is above the first, danger below. */
  tone?: SparklineTone;
  /** Accessible name, e.g. "Price over 30 days". */
  label: string;
  /** Shown when there are fewer than two known values. */
  emptyText?: string;
  className?: string;
}

function toneColor(tone: SparklineTone, first: number | null, last: number | null): string {
  if (tone === 'accent') return 'var(--arsenal-accent)';
  if (tone === 'info') return 'var(--arsenal-accent-cyan)';
  if (first === null || last === null || first === last) return 'var(--arsenal-text-secondary)';
  return last > first ? 'var(--arsenal-success)' : 'var(--arsenal-danger)';
}

/** Small trend line with a soft area fill; the line draws itself in once unless motion is reduced. */
export function Sparkline({
  values,
  width = 180,
  height = 48,
  tone = 'auto',
  label,
  emptyText = 'Not enough data for a trend.',
  className,
}: SparklineProps) {
  const gradientId = `arsenal-spark-${useId().replace(/:/g, '')}`;
  const geo = sparkGeometry(values, width, height);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion()) {
      setDrawn(true);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (geo.lines.length === 0) {
    return (
      <p className={cn('m-0 text-sm text-[var(--arsenal-text-secondary)]', className)}>
        {emptyText}
      </p>
    );
  }

  const color = toneColor(tone, geo.first, geo.lastValue);
  return (
    <figure className={cn('m-0 inline-block', className)} style={{ color }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="block overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        {geo.areas.map((d) => (
          <path key={`a-${d}`} d={d} fill={`url(#${gradientId})`} opacity={0.82} />
        ))}
        {geo.lines.map((d) => (
          <path
            key={`l-${d}`}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            style={{
              strokeDashoffset: drawn ? 0 : 1,
              transition: 'stroke-dashoffset 780ms var(--arsenal-ease-out, ease-out)',
            }}
          />
        ))}
        {geo.last ? (
          <circle
            cx={geo.last.x}
            cy={geo.last.y}
            r={2.8}
            fill="currentColor"
            stroke="var(--arsenal-surface)"
            strokeWidth={1.5}
          />
        ) : null}
      </svg>
      <ul className="sr-only">
        {values.map((v, i) => (
          // Index is the identity here: positions in a time series.
          // eslint-disable-next-line react/no-array-index-key
          <li key={i}>{v === null || !Number.isFinite(v) ? 'unknown' : String(v)}</li>
        ))}
      </ul>
    </figure>
  );
}
