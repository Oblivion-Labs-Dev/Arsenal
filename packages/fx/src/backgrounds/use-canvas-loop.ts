'use client';

import { useEffect, useRef, type DependencyList, type RefObject } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '@arsenal/motion';
import { bindCanvasRunState, canvasBackingDpr } from '../runtime/canvas-guard';

export type CanvasSize = { width: number; height: number; dpr: number };

export type CanvasFrame = CanvasSize & {
  ctx: CanvasRenderingContext2D;
  /** Frame step in 60fps units, clamped to 2.4 (40 ms). 0 for the static reduced-motion frame. */
  dt: number;
  /** Milliseconds since the previous frame, clamped to 40. 0 for the static frame. */
  deltaMs: number;
  /** Timestamp in ms (rAF clock). */
  time: number;
  /** True when motion is reduced: draw one calm, complete frame. */
  reduced: boolean;
};

export type CanvasLoopOptions = {
  /** Draws one frame. The context is already scaled to CSS pixels. */
  draw: (frame: CanvasFrame) => void;
  /** Called after the backing store is resized (and once at start). */
  onResize?: (size: CanvasSize) => void;
  /** IntersectionObserver margin for pausing off-screen work. */
  rootMargin?: string;
  /** DPR cap; defaults to `canvasBackingDpr()`'s 1.25 / 1.5. */
  maxDpr?: number;
};

/**
 * The one loop every Arsenal canvas background uses: sizes the backing store with a capped DPR,
 * pauses when the tab is hidden or the canvas is off screen, and draws a single static frame when
 * motion is reduced (OS setting or `<html data-motion="paused">`). `deps` restart the loop, which
 * also repaints the static frame, e.g. after a theme change.
 */
export function useCanvasLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: CanvasLoopOptions,
  deps: DependencyList = [],
): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const { rootMargin, maxDpr } = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let running = false;
    let reduced = shouldReduceMotion();

    const measure = (): boolean => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      const nextDpr = canvasBackingDpr(maxDpr);
      const bw = Math.max(1, Math.round(rect.width * nextDpr));
      const bh = Math.max(1, Math.round(rect.height * nextDpr));
      const changed =
        Math.abs(rect.width - width) > 0.5 ||
        Math.abs(rect.height - height) > 0.5 ||
        nextDpr !== dpr;
      width = rect.width;
      height = rect.height;
      dpr = nextDpr;
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (changed) optionsRef.current.onResize?.({ width, height, dpr });
      return true;
    };

    const render = (time: number, deltaMs: number) => {
      if (width < 1 || height < 1) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      optionsRef.current.draw({
        ctx,
        width,
        height,
        dpr,
        dt: deltaMs / 16.67,
        deltaMs,
        time,
        reduced,
      });
    };

    const tick = (ts: number) => {
      raf = 0;
      if (!running || reduced) return;
      const deltaMs = last ? Math.min(40, Math.max(0, ts - last)) : 16.67;
      last = ts;
      render(ts, deltaMs);
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const drawStatic = () => render(performance.now(), 0);

    const sync = () => {
      if (reduced) {
        stop();
        drawStatic();
      } else if (running) {
        if (!raf) {
          last = 0;
          raf = requestAnimationFrame(tick);
        }
      } else {
        stop();
      }
    };

    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (measure() && (reduced || !running)) drawStatic();
          });
    ro?.observe(canvas);
    const onWindowResize = () => {
      if (measure() && (reduced || !running)) drawStatic();
    };
    if (!ro) window.addEventListener('resize', onWindowResize);

    measure();
    const disposeRun = bindCanvasRunState(
      canvas,
      (run) => {
        running = run;
        sync();
      },
      { rootMargin },
    );
    const disposeMotion = onMotionPreferenceChange((next) => {
      reduced = next;
      sync();
    });

    return () => {
      stop();
      disposeRun();
      disposeMotion();
      ro?.disconnect();
      if (!ro) window.removeEventListener('resize', onWindowResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, rootMargin, maxDpr, ...deps]);
}

/** Pointer position in canvas CSS pixels, or null when outside / inactive. */
export type PointerState = { x: number; y: number; pressed: boolean; pressedAt: number } | null;

/**
 * Tracks the pointer over `target` (default: the canvas's own box, listening on window so a
 * `pointer-events: none` background still reacts). Returns a ref read inside `draw`.
 */
export function usePointer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled = true,
): RefObject<PointerState> {
  const pointerRef = useRef<PointerState>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) {
      pointerRef.current = null;
      return;
    }
    const place = (e: PointerEvent, pressed?: boolean) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      const prev = pointerRef.current;
      if (!inside) {
        pointerRef.current = null;
        return;
      }
      const isPressed = pressed ?? prev?.pressed ?? false;
      pointerRef.current = {
        x,
        y,
        pressed: isPressed,
        pressedAt: pressed === true && !prev?.pressed ? performance.now() : (prev?.pressedAt ?? 0),
      };
    };
    const onMove = (e: PointerEvent) => place(e);
    const onDown = (e: PointerEvent) => place(e, true);
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') {
        pointerRef.current = null;
        return;
      }
      place(e, false);
    };
    const onLeave = () => {
      pointerRef.current = null;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onLeave);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      pointerRef.current = null;
    };
  }, [canvasRef, enabled]);

  return pointerRef;
}
