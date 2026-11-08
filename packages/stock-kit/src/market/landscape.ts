// Pure geometry for the Market Landscape hero: which closes a range shows, where each close sits on
// the ridge, and how the ridge morphs between ranges. No DOM here, so it is unit-tested directly.

export interface Close {
  date: string;
  close: number;
}

export const RANGES = [
  { id: "1M", label: "1M", sessions: 21, spoken: "one month" },
  { id: "3M", label: "3M", sessions: 63, spoken: "three months" },
  { id: "6M", label: "6M", sessions: 126, spoken: "six months" },
  { id: "1Y", label: "1Y", sessions: 252, spoken: "one year" },
] as const;
export type RangeId = (typeof RANGES)[number]["id"];

/** The last `sessions` valid closes, oldest first. Non-finite or non-positive closes are dropped. */
export function sliceRange(closes: readonly Close[], sessions: number): Close[] {
  const valid = closes.filter((c) => Number.isFinite(c.close) && c.close > 0);
  return valid.slice(Math.max(0, valid.length - sessions));
}

/** A range is only offered when the stored history actually covers most of it. */
export function availableRanges(count: number): RangeId[] {
  return RANGES.filter((r, i) => i === 0 || count >= r.sessions * 0.8).map((r) => r.id);
}

export interface Box {
  width: number;
  /** Top of the band the ridge may use. */
  top: number;
  /** Bottom of the band the ridge may use. */
  bottom: number;
}

/** Screen points for the closes, spread across the full width, highest close at `top`. */
export function ridgePoints(closes: readonly Close[], box: Box): { x: number; y: number }[] {
  if (closes.length < 2) return [];
  const values = closes.map((c) => c.close);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const last = closes.length - 1;
  return values.map((v, i) => ({
    x: (i / last) * box.width,
    y:
      hi === lo
        ? (box.top + box.bottom) / 2
        : box.bottom - ((v - lo) / span) * (box.bottom - box.top),
  }));
}

/** Resample to exactly `n` points by linear interpolation, so two ranges can morph point for point. */
export function resample(points: readonly { x: number; y: number }[], n: number) {
  if (points.length === 0 || n < 2) return [];
  if (points.length === 1) return Array.from({ length: n }, () => ({ ...points[0]! }));
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * (points.length - 1);
    const a = Math.floor(t);
    const b = Math.min(points.length - 1, a + 1);
    const f = t - a;
    return {
      x: points[a]!.x + (points[b]!.x - points[a]!.x) * f,
      y: points[a]!.y + (points[b]!.y - points[a]!.y) * f,
    };
  });
}

export function lerpPoints(
  from: readonly { x: number; y: number }[],
  to: readonly { x: number; y: number }[],
  t: number,
) {
  return to.map((p, i) => {
    const q = from[i] ?? p;
    return { x: q.x + (p.x - q.x) * t, y: q.y + (p.y - q.y) * t };
  });
}

const r = (n: number) => Number(n.toFixed(1));

/** A smooth line through the points (Catmull-Rom as cubic Béziers). */
export function smoothPath(points: readonly { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${r(points[0]!.x)} ${r(points[0]!.y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(p2.x)} ${r(p2.y)}`;
  }
  return d;
}

/** Index of the close nearest to horizontal position `x` (0..width). */
export function nearestIndex(x: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round((x / width) * (count - 1))));
}

/** Change from the first close of the range to close `index`, as a fraction (0.012 is 1.2%). */
export function changeFromStart(closes: readonly Close[], index: number): number | null {
  const first = closes[0]?.close;
  const at = closes[index]?.close;
  if (first == null || at == null || first <= 0) return null;
  return at / first - 1;
}
