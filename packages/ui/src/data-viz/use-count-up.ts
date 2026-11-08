import { useEffect, useRef, useState } from 'react';
import { shouldReduceMotion } from '@arsenal/motion';
import { roundTo } from './chart-geometry';
import { tweenValue } from './math';

export interface CountUpOptions {
  /** How long the climb takes. Defaults to 900ms; 0 or less jumps straight to the value. */
  durationMs?: number;
  /** Hold before the first climb starts, to stagger a row of figures. */
  delayMs?: number;
  /** Decimal places kept while counting; 0 counts in whole numbers. Omit for no rounding. */
  decimals?: number;
  /**
   * Where the first count starts when a figure appears. Defaults to 0. Pass `null` to show the
   * first value immediately and only animate later changes.
   */
  startFrom?: number | null;
}

const DEFAULT_DURATION_MS = 900;

/**
 * Animated figure for `target`.
 *
 * - The first time a value appears it counts up from `startFrom` (0 by default).
 * - Later changes continue from whatever is on screen, so an interrupted count never jumps.
 * - Re-renders that do not change the value leave the figure alone, so polling dashboards settle.
 * - `null` stays `null` (unknown is never shown as 0).
 * - Reduced motion (OS setting or `<html data-motion="paused">`) shows the value immediately.
 */
export function useCountUp(target: number | null, options: CountUpOptions = {}): number | null {
  const { durationMs = DEFAULT_DURATION_MS, delayMs = 0, decimals, startFrom = 0 } = options;
  const shownRef = useRef<number | null>(null);
  const [shown, setShown] = useState<number | null>(() =>
    target === null || startFrom === null || !Number.isFinite(target) ? target : startFrom,
  );

  useEffect(() => {
    const commit = (value: number | null) => {
      shownRef.current = value;
      setShown(value);
    };
    if (target === null || !Number.isFinite(target)) {
      commit(target);
      return undefined;
    }
    const from = shownRef.current ?? startFrom;
    if (from === null || from === target || durationMs <= 0 || shouldReduceMotion()) {
      commit(target);
      return undefined;
    }
    const round = (n: number) => (decimals === undefined ? n : roundTo(n, decimals));
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const begin = () => {
      let start: number | null = null;
      const tick = (now: number) => {
        if (shouldReduceMotion()) {
          commit(target);
          return;
        }
        start ??= now;
        const progress = Math.min(1, (now - start) / durationMs);
        commit(progress < 1 ? round(tweenValue(from, target, progress)) : target);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    // Only the very first appearance waits; later changes respond immediately.
    if (delayMs > 0 && shownRef.current === null) timer = setTimeout(begin, delayMs);
    else begin();
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== null) clearTimeout(timer);
    };
  }, [target, durationMs, delayMs, decimals, startFrom]);

  if (target === null) return null;
  return shown;
}
