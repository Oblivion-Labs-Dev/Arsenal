// Pure geometry for the dependency-free SVG charts. Unknown values stay unknown: they produce gaps
// or no mark, never a zero or an invented point.

const isKnown = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const round2 = (n: number) => Number(n.toFixed(2));

/* ------------------------------------------------------------------ */
/* Semi gauge                                                          */
/* ------------------------------------------------------------------ */

export interface SemiGaugeBand {
  /** Start of the band as a share of the dial, 0..1. */
  from: number;
  /** End of the band as a share of the dial, 0..1. */
  to: number;
}

export interface SemiGaugeGeometry {
  /** One SVG arc path per band, same order as the input bands. */
  arcs: string[];
  /** Needle tip, or null when the value is unknown. */
  needle: { x: number; y: number } | null;
  /** The clamped share the needle points at, or null when unknown. */
  share: number | null;
}

export interface SemiGaugeFrame {
  cx: number;
  cy: number;
  radius: number;
  /** How far the needle stops short of the arc. */
  needleInset?: number;
}

/**
 * Half-dial geometry: 0 sits on the left, 1 on the right. A null, NaN or infinite share draws no
 * needle rather than a guessed one.
 */
export function semiGaugeGeometry(
  share: number | null,
  bands: readonly SemiGaugeBand[],
  { cx, cy, radius, needleInset = 6 }: SemiGaugeFrame,
): SemiGaugeGeometry {
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const point = (t: number, r: number) => {
    const angle = Math.PI * (1 - clamp01(t));
    return { x: round2(cx + r * Math.cos(angle)), y: round2(cy - r * Math.sin(angle)) };
  };
  const arcs = bands.map((band) => {
    const a = point(band.from, radius);
    const b = point(band.to, radius);
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`;
  });
  const safe = isKnown(share) ? clamp01(share) : null;
  return {
    arcs,
    share: safe,
    needle: safe === null ? null : point(safe, Math.max(0, radius - needleInset)),
  };
}

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

export interface DonutArc {
  /** Index of the segment in the input. */
  index: number;
  /** Visible stroke length along the circle. */
  length: number;
  /** stroke-dashoffset that starts this arc where the previous one ended. */
  offset: number;
  /** Share of the known total, 0..1. */
  share: number;
}

/**
 * Stroke-dash arcs for a donut. Negative or non-finite values are ignored (they get no arc); a
 * total of zero yields no arcs so the empty track shows instead of a fake full ring.
 */
export function donutArcs(values: readonly (number | null)[], circumference: number): DonutArc[] {
  const safe = values.map((v) => (isKnown(v) && v > 0 ? v : 0));
  const total = safe.reduce((sum, v) => sum + v, 0);
  if (total <= 0 || !(circumference > 0)) return [];
  let cumulative = 0;
  const arcs: DonutArc[] = [];
  safe.forEach((value, index) => {
    if (value <= 0) return;
    const length = (value / total) * circumference;
    arcs.push({ index, length, offset: -cumulative, share: value / total });
    cumulative += length;
  });
  return arcs;
}

/* ------------------------------------------------------------------ */
/* Line chart                                                          */
/* ------------------------------------------------------------------ */

export interface LinePlotFrame {
  /** Left edge of the plot area. */
  left: number;
  /** Right edge of the plot area. */
  right: number;
  /** Top of the plot area (where `max` lands). */
  top: number;
  /** Bottom of the plot area (where `min` lands). */
  bottom: number;
}

export interface LineGeometry {
  /** One path per run of consecutive known values. */
  segments: string[];
  /** Point for every known value, in input order. */
  points: { index: number; x: number; y: number; value: number }[];
  min: number;
  max: number;
}

/**
 * Line path split at null gaps. The y range runs from `min` (default: 0 or the lowest value if
 * negative) to `max` (default: highest known value, at least `min + 1`).
 */
export function lineGeometry(
  values: readonly (number | null)[],
  frame: LinePlotFrame,
  range: { min?: number; max?: number } = {},
): LineGeometry {
  const known = values.filter(isKnown);
  const min = isKnown(range.min) ? range.min : Math.min(0, ...known);
  const rawMax = isKnown(range.max) ? range.max : Math.max(min, ...known);
  const max = rawMax > min ? rawMax : min + 1;
  const span = max - min;
  const step = values.length > 1 ? (frame.right - frame.left) / (values.length - 1) : 0;
  const x = (index: number) =>
    round2(values.length > 1 ? frame.left + index * step : (frame.left + frame.right) / 2);
  const y = (value: number) =>
    round2(frame.bottom - ((value - min) / span) * (frame.bottom - frame.top));
  const points: LineGeometry['points'] = [];
  const segments: string[] = [];
  let current = '';
  values.forEach((value, index) => {
    if (!isKnown(value)) {
      if (current) segments.push(current);
      current = '';
      return;
    }
    const p = { index, x: x(index), y: y(value), value };
    points.push(p);
    current += `${current ? ' L' : 'M'}${p.x},${p.y}`;
  });
  if (current) segments.push(current);
  return { segments, points, min, max };
}

/* ------------------------------------------------------------------ */
/* Stacked bars and distributions                                      */
/* ------------------------------------------------------------------ */

/** Sum of the visible keys of one row; unknown cells count as nothing. */
export function stackTotal<K extends string>(
  row: Readonly<Record<K, number | null>>,
  keys: readonly K[],
): number {
  return keys.reduce((sum, key) => {
    const v = row[key];
    return sum + (isKnown(v) && v > 0 ? v : 0);
  }, 0);
}

/** Tallest stack across rows, at least 1 so an empty chart never divides by zero. */
export function stackMax<K extends string>(
  rows: readonly Readonly<Record<K, number | null>>[],
  keys: readonly K[],
): number {
  return Math.max(1, ...rows.map((row) => stackTotal(row, keys)));
}

export interface DistributionShare {
  index: number;
  value: number;
  /** Share of the total, 0..1; 0 when the total is 0. */
  share: number;
}

/** Shares of a total for horizontal distribution bars. Negative and unknown counts become 0. */
export function distributionShares(values: readonly (number | null)[]): {
  total: number;
  shares: DistributionShare[];
} {
  const safe = values.map((v) => (isKnown(v) && v > 0 ? v : 0));
  const total = safe.reduce((sum, v) => sum + v, 0);
  return {
    total,
    shares: safe.map((value, index) => ({ index, value, share: total > 0 ? value / total : 0 })),
  };
}

/* ------------------------------------------------------------------ */
/* Count up                                                            */
/* ------------------------------------------------------------------ */

/** Round to a fixed number of decimal places; negative or non-integer `decimals` falls back to none. */
export function roundTo(value: number, decimals: number): number {
  const places = Number.isInteger(decimals) && decimals > 0 ? decimals : 0;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
