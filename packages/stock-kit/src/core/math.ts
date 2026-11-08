// Pure math for the core kit components: easing, delta text, sparkline and ridge paths.

export const easeOutCubic = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;

/** Value shown at `progress` (0..1) of a count from `from` to `to`. */
export const tweenValue = (from: number, to: number, progress: number) =>
  from + (to - from) * easeOutCubic(progress);

export type DeltaText = {
  tone: "up" | "down" | "muted";
  arrow: "▲" | "▼" | "";
  visible: string;
  spoken: string;
};

/** Text for a signed change. `pct` values are fractions (0.012 is 1.2%). */
export function deltaText(value: number, kind: "pct" | "money" = "pct"): DeltaText {
  const abs = Math.abs(value);
  const magnitude =
    kind === "pct"
      ? `${(abs * 100).toFixed(1)}%`
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(abs);
  const rounded = kind === "pct" ? Number((abs * 100).toFixed(1)) : Number(abs.toFixed(2));
  if (value === 0 || rounded === 0)
    return { tone: "muted", arrow: "", visible: magnitude, spoken: "unchanged" };
  const up = value > 0;
  const spokenMagnitude = kind === "pct" ? `${(abs * 100).toFixed(1)} percent` : magnitude;
  return {
    tone: up ? "up" : "down",
    arrow: up ? "▲" : "▼",
    visible: `${up ? "+" : "−"}${magnitude}`,
    spoken: `${up ? "up" : "down"} ${spokenMagnitude}`,
  };
}

export type SparkGeometry = {
  /** One line path per run of consecutive known values. */
  lines: string[];
  /** Closed area path under each line, same order as `lines`. */
  areas: string[];
  last: { x: number; y: number } | null;
  first: number | null;
  lastValue: number | null;
  known: number;
};

/** Sparkline paths with gaps at null or non-finite values; fewer than 2 known values draws nothing. */
export function sparkGeometry(
  values: (number | null)[],
  width: number,
  height: number,
  pad = 2,
): SparkGeometry {
  const known = values.flatMap((v, index) =>
    v === null || !Number.isFinite(v) ? [] : [{ v, index }],
  );
  if (known.length < 2)
    return { lines: [], areas: [], last: null, first: null, lastValue: null, known: known.length };
  const lo = Math.min(...known.map((p) => p.v));
  const hi = Math.max(...known.map((p) => p.v));
  const span = hi - lo || 1;
  const point = (v: number, index: number) => ({
    x: (index / Math.max(1, values.length - 1)) * width,
    y: hi === lo ? height / 2 : height - pad - ((v - lo) / span) * (height - 2 * pad),
  });
  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push(point(v, i));
  });
  if (run.length) runs.push(run);
  const fmt = (n: number) => Number(n.toFixed(2));
  const lines = runs.map((r) =>
    r.map((p, i) => `${i ? "L" : "M"}${fmt(p.x)},${fmt(p.y)}`).join(" "),
  );
  const areas = runs.map(
    (r, i) => `${lines[i]} L${fmt(r[r.length - 1]!.x)},${height} L${fmt(r[0]!.x)},${height} Z`,
  );
  const end = known[known.length - 1]!;
  return {
    lines,
    areas,
    last: point(end.v, end.index),
    first: known[0]!.v,
    lastValue: end.v,
    known: known.length,
  };
}

/** Front ridge for the atmosphere: the series normalised into a band of a 1000-wide viewBox. */
export function ridgePath(values: number[], top = 48, bottom = 82): string {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2 || finite.length !== values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${((i * 1000) / (values.length - 1)).toFixed(1)},${(bottom - ((v - min) / span) * (bottom - top)).toFixed(1)}`,
    )
    .join(" ");
}
