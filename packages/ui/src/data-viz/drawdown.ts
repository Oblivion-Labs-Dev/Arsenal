export type EquityPoint = { date: string; equity: number };
export type DrawdownPoint = EquityPoint & { drawdownPct: number; peak: number };
export type DrawdownSummary = {
  points: DrawdownPoint[];
  worst: DrawdownPoint;
  recoveryDate: string | null;
};

/** Convert equity into percent below its running high and locate the worst trough and recovery. */
export function calculateDrawdown(points: EquityPoint[]): DrawdownSummary | null {
  if (points.length < 2 || points.some((point) => !Number.isFinite(point.equity))) return null;
  let peak = points[0]!.equity;
  const series = points.map((point) => {
    peak = Math.max(peak, point.equity);
    return {
      ...point,
      peak,
      drawdownPct: peak === 0 ? 0 : ((point.equity - peak) / Math.abs(peak)) * 100,
    };
  });
  const worst = series.reduce(
    (low, point) => (point.drawdownPct < low.drawdownPct ? point : low),
    series[0]!,
  );
  const recovery =
    worst.drawdownPct === 0
      ? worst
      : series.find((point, index) => index > series.indexOf(worst) && point.equity >= worst.peak);
  return { points: series, worst, recoveryDate: recovery?.date ?? null };
}
