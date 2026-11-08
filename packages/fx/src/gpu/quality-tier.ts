/**
 * Adaptive quality for a GPU scene. A scene starts at the best tier its screen allows, measures its
 * own GPU time (e.g. with timestamp queries), and steps down one tier at a time while a frame costs
 * more than the budget. It never steps back up: a cheaper tier always measures faster, which would
 * only argue for climbing again.
 *
 * Ported from Sutra `apps/web/src/hero-quality.ts`; the hero-specific settings became the generic
 * `settings` payload.
 */

/** GPU milliseconds a frame may take by default; sized for a full scene on an integrated GPU. */
export const DEFAULT_FRAME_BUDGET_MS = 4;

/** A named rung on a quality ladder, carrying whatever settings the scene needs. */
export interface QualityTier<T> {
  readonly id: string;
  readonly settings: T;
}

/** The median of measured frame times, or null when nothing was measured yet. */
export function medianFrameMs(frameMs: readonly number[]): number | null {
  const valid = frameMs.filter((ms) => Number.isFinite(ms));
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? null;
}

/**
 * The tier to use after measuring frames at `current`: one step down `ladder` (ordered best first)
 * if the median frame is over budget, otherwise `current`. With no samples it stays put. Works for
 * string ids (`["full", "half", "minimal"]`) or `QualityTier` objects alike.
 */
export function nextTier<T>(
  ladder: readonly T[],
  current: T,
  frameMs: readonly number[],
  budgetMs: number = DEFAULT_FRAME_BUDGET_MS,
): T {
  const index = ladder.indexOf(current);
  if (index < 0) throw new Error('nextTier(): current tier is not on the ladder');
  const median = medianFrameMs(frameMs);
  if (median === null || median <= budgetMs) return current;
  return ladder[Math.min(index + 1, ladder.length - 1)] ?? current;
}
