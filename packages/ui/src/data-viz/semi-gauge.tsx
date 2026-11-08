import { cn } from '../lib/cn';
import { semiGaugeGeometry } from './chart-geometry';

export interface SemiGaugeBandSpec {
  /** Start of the band as a share of the dial, 0..1. */
  from: number;
  /** End of the band as a share of the dial, 0..1. */
  to: number;
  /** CSS colour, ideally an `--arsenal-*` variable. */
  color: string;
  /** Legend text. */
  label: string;
}

export interface SemiGaugeProps {
  /** Needle position as a share of the dial, 0 (left) .. 1 (right). `null` draws no needle. */
  share: number | null;
  bands?: SemiGaugeBandSpec[];
  /** Accessible name, e.g. "Market mood". */
  label: string;
  /** Text under the dial, e.g. "62% advancing". Defaults to "unknown" when `share` is null. */
  valueLabel?: string;
  /** Show the band legend. */
  showLegend?: boolean;
  /** Rendered width in px. */
  width?: number;
  className?: string;
}

/** Loss / flat / gain bands, the default mood dial. */
export const DEFAULT_SEMI_GAUGE_BANDS: SemiGaugeBandSpec[] = [
  { from: 0, to: 0.49, color: 'var(--arsenal-danger)', label: 'Down' },
  { from: 0.49, to: 0.51, color: 'var(--arsenal-muted)', label: 'Flat' },
  { from: 0.51, to: 1, color: 'var(--arsenal-success)', label: 'Up' },
];

/** Half-dial with coloured bands and a needle. */
export function SemiGauge({
  share,
  bands = DEFAULT_SEMI_GAUGE_BANDS,
  label,
  valueLabel,
  showLegend = false,
  width = 96,
  className,
}: SemiGaugeProps) {
  const geo = semiGaugeGeometry(share, bands, { cx: 32, cy: 30, radius: 24 });
  const text = valueLabel ?? (geo.share === null ? 'unknown' : `${Math.round(geo.share * 100)}%`);
  return (
    <figure className={cn('m-0 inline-flex flex-col items-center gap-1', className)}>
      <svg
        viewBox="0 0 64 36"
        width={width}
        height={(width * 36) / 64}
        role="img"
        aria-label={`${label}: ${text}`}
      >
        {geo.arcs.map((d, i) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={bands[i]!.color}
            strokeWidth={5}
            strokeLinecap="butt"
          />
        ))}
        {geo.needle ? (
          <g>
            <line
              x1={32}
              y1={30}
              x2={geo.needle.x}
              y2={geo.needle.y}
              stroke="var(--arsenal-text-primary)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <circle cx={32} cy={30} r={3.2} fill="var(--arsenal-text-primary)" />
          </g>
        ) : null}
      </svg>
      <figcaption
        aria-hidden="true"
        className="text-xs tabular-nums text-[var(--arsenal-text-secondary)]"
      >
        {text}
      </figcaption>
      {showLegend ? (
        <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-[var(--arsenal-text-secondary)]">
          {bands.map((band) => (
            <li key={band.label} className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: band.color }}
              />
              {band.label}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
