'use client';

import { useEffect, type RefObject } from 'react';
import { shouldReduceMotion } from '../motion-gate';

/**
 * Burn-in care for always-on screens (TVs, kiosks, OLED dashboards): the whole layout wanders a
 * few pixels every couple of minutes so static edges never sit on the same subpixels for hours.
 * Uses the separate `translate` property, so it composes with any `transform` already on the
 * element and moves the composited layer without relayout. Under reduced or paused motion the
 * position still changes (that is the point) but jumps instead of gliding.
 */

export type DriftPoint = readonly [x: number, y: number];

/** Default wander path in CSS px; a small loop around the origin. */
export const DEFAULT_DRIFT_PATH: readonly DriftPoint[] = [
  [0, 0],
  [3, -2],
  [5, 1],
  [2, 4],
  [-2, 5],
  [-5, 2],
  [-4, -2],
  [-1, -5],
  [3, -4],
];

export interface PixelDriftOptions {
  /** Time between moves, ms. Default 120000 (2 min). */
  interval?: number;
  /** Glide duration for each move, ms. Default 6000. */
  glide?: number;
  /** Points to visit in order, then loop. */
  path?: readonly DriftPoint[];
}

export interface PixelDriftHandle {
  /** Stop drifting and clear the offset. */
  stop: () => void;
  /** Move to the next point now. */
  step: () => void;
}

/** The point after `index` on `path`, and its index. */
export function nextDriftStep(
  index: number,
  path: readonly DriftPoint[],
): { index: number; translate: string } {
  if (path.length === 0) return { index: 0, translate: '0px 0px' };
  const next = (index + 1) % path.length;
  const point = path[next] ?? [0, 0];
  return { index: next, translate: `${point[0]}px ${point[1]}px` };
}

export function startPixelDrift(
  element: HTMLElement,
  options: PixelDriftOptions = {},
): PixelDriftHandle {
  const { interval = 120_000, glide = 6_000, path = DEFAULT_DRIFT_PATH } = options;
  let index = 0;
  const move = () => {
    if (document.hidden) return;
    const next = nextDriftStep(index, path);
    index = next.index;
    const from = getComputedStyle(element).translate;
    element.style.translate = next.translate;
    if (!shouldReduceMotion() && from && from !== 'none' && typeof element.animate === 'function') {
      element.animate([{ translate: from }, { translate: next.translate }], {
        duration: glide,
        easing: 'ease-in-out',
      });
    }
  };
  const timer = window.setInterval(move, interval);
  return {
    stop() {
      window.clearInterval(timer);
      element.style.translate = '';
    },
    step: move,
  };
}

/** React wrapper: drifts `ref.current` while mounted and `enabled`. */
export function usePixelDrift<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: PixelDriftOptions & { enabled?: boolean } = {},
): void {
  const { enabled = true, interval, glide, path } = options;
  useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const handle = startPixelDrift(element, { interval, glide, path });
    return handle.stop;
  }, [ref, enabled, interval, glide, path]);
}
