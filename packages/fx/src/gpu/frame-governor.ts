import { medianFrameMs, nextTier } from './quality-tier';

/**
 * Walks a quality ladder from the gaps between animation frames, for effects that cannot measure
 * their own GPU time. It is the wall-clock driver for `nextTier`, not a second tier system: the
 * same ladder (best first, last rung usually "still") and the same one-step-down rule.
 *
 * - Sustained, not momentary: the first frames after start or `reset()` are ignored (layout and
 *   decode), then a full window's median decides. A run of very long frames steps down early so a
 *   struggling phone recovers sooner. Gaps longer than `pauseMs` mean the loop was paused (hidden
 *   tab, offscreen) and restart the window instead of counting as slow.
 * - Careful recovery: stepping back up needs `recoverWindows` consecutive windows well under budget
 *   (`recoverRatio`). A tier that fails again within `probeWindows` after a climb becomes the ceiling
 *   for good, so the governor cannot oscillate. `recoverWindows: 0` disables climbing.
 * - Reduced motion pins the last rung while it is on and restores the earlier tier when it is off.
 * - Listeners hear only real tier changes, so a React consumer renders once per change, not per
 *   frame.
 *
 * Generalised from Sutra `apps/web/src/frameGovernor.ts` (a single ok/slow verdict).
 */
export interface FrameGovernorOptions<T> {
  /** Starting tier. Default: the first (best) rung. */
  initial?: T;
  /** Frames ignored after start or reset. Default 5. */
  warmup?: number;
  /** Gaps in one decision window. Default 30 (half a second at 60fps). */
  window?: number;
  /** A median gap above this (ms) steps down. Default 34, just under 30fps. */
  budgetMs?: number;
  /** This many gaps over twice the budget within a window step down early. Default 4. */
  spikes?: number;
  /** A gap longer than this (ms) is a pause, not a slow frame. Default 250. */
  pauseMs?: number;
  /** Consecutive good windows before climbing one rung. Default 6; 0 never climbs. */
  recoverWindows?: number;
  /** A window is "good" when its median is at most budget × this. Default 0.6. */
  recoverRatio?: number;
  /** Windows after a climb during which a failure locks the ceiling. Default 4. */
  probeWindows?: number;
  /** Start with reduced motion on. */
  reducedMotion?: boolean;
}

export interface FrameGovernor<T> {
  /** Feed one requestAnimationFrame timestamp; returns the tier to render. */
  frame(now: number): T;
  /** Drop the unsettled measurement (call when the loop pauses). The tier stays. */
  reset(): void;
  setReducedMotion(reduced: boolean): void;
  /** Called with the new tier after each change; returns an unsubscribe function. */
  subscribe(listener: (tier: T) => void): () => void;
  readonly tier: T;
  /** The best tier the governor may still climb to. */
  readonly ceiling: T;
}

export function createFrameGovernor<T>(
  ladder: readonly T[],
  options: FrameGovernorOptions<T> = {},
): FrameGovernor<T> {
  if (ladder.length === 0) throw new Error('createFrameGovernor(): the ladder is empty');
  const {
    warmup = 5,
    window = 30,
    budgetMs = 34,
    spikes = 4,
    pauseMs = 250,
    recoverWindows = 6,
    recoverRatio = 0.6,
    probeWindows = 4,
  } = options;
  const last = ladder.length - 1;
  let index = options.initial === undefined ? 0 : ladder.indexOf(options.initial);
  if (index < 0) throw new Error('createFrameGovernor(): initial tier is not on the ladder');
  let ceiling = 0;
  let reduced = options.reducedMotion ?? false;
  let seen = 0;
  let previous: number | null = null;
  let gaps: number[] = [];
  let longGaps = 0;
  let goodWindows = 0;
  /** Windows left in which a failure after a climb locks the ceiling; 0 when not probing. */
  let probing = 0;
  const listeners = new Set<(tier: T) => void>();

  const current = () => ladder[reduced ? last : index]!;
  const restart = () => {
    seen = 0;
    previous = null;
    gaps = [];
    longGaps = 0;
  };
  const change = (to: number) => {
    const before = current();
    index = to;
    restart();
    const after = current();
    if (after !== before) for (const listener of listeners) listener(after);
  };
  const stepDown = () => {
    goodWindows = 0;
    // A climbed tier that failed again is not tried a third time.
    if (probing > 0) ceiling = Math.max(ceiling, Math.min(index + 1, last));
    probing = 0;
    change(Math.min(index + 1, last));
  };

  return {
    frame(now) {
      if (reduced) return current();
      seen += 1;
      const gapStart = previous;
      previous = now;
      if (gapStart === null) return current();
      const gap = now - gapStart;
      if (gap > pauseMs || gap < 0) {
        restart();
        previous = now;
        return current();
      }
      if (seen <= warmup) return current();
      gaps.push(gap);
      if (gap > budgetMs * 2 && ++longGaps >= spikes) {
        stepDown();
        return current();
      }
      if (gaps.length < window) return current();
      const median = medianFrameMs(gaps)!;
      const verdict = nextTier(ladder, ladder[index]!, gaps, budgetMs);
      gaps = [];
      longGaps = 0;
      if (verdict !== ladder[index]) {
        stepDown();
      } else if (probing > 0) {
        probing -= 1;
      } else if (recoverWindows > 0 && index > ceiling && median <= budgetMs * recoverRatio) {
        if (++goodWindows >= recoverWindows) {
          goodWindows = 0;
          probing = probeWindows;
          change(index - 1);
        }
      } else {
        goodWindows = 0;
      }
      return current();
    },
    reset: restart,
    setReducedMotion(next) {
      if (next === reduced) return;
      const before = current();
      reduced = next;
      restart();
      const after = current();
      if (after !== before) for (const listener of listeners) listener(after);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get tier() {
      return current();
    },
    get ceiling() {
      return ladder[ceiling]!;
    },
  };
}
