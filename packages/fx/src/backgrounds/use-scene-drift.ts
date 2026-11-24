'use client';

import { useEffect, useRef } from 'react';

export type SceneDriftState = {
  /** `window.scrollY`, or 0 when motion is reduced. */
  scrollY: number;
  /** Last mouse position in client pixels; null before the first move, after leaving, or when reduced. */
  pointer: { x: number; y: number } | null;
  reduced: boolean;
};

export type SceneDriftOptions = {
  reduced: boolean;
  scroll?: boolean;
  pointer?: boolean;
};

/**
 * Feeds scroll and mouse position to `apply` at most once per animation frame, so scenes can write
 * transforms straight to the DOM without re-rendering. `apply` always runs once on mount and when
 * the options change; under reduced motion that single call carries the resting state and no
 * listeners are attached.
 */
export function useSceneDrift(
  { reduced, scroll = true, pointer = true }: SceneDriftOptions,
  apply: (state: SceneDriftState) => void,
): void {
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (reduced || (!scroll && !pointer)) {
      applyRef.current({ scrollY: 0, pointer: null, reduced });
      return;
    }

    let raf = 0;
    let pos: { x: number; y: number } | null = null;
    const flush = () => {
      raf = 0;
      applyRef.current({ scrollY: scroll ? window.scrollY : 0, pointer: pos, reduced: false });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pos = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onLeave = () => {
      pos = null;
      schedule();
    };

    flush();
    if (scroll) window.addEventListener('scroll', schedule, { passive: true });
    if (pointer) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced, scroll, pointer]);
}
