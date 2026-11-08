'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '../motion-gate';

/**
 * True when motion should be skipped (OS reduced-motion or `<html data-motion="paused">`).
 * Re-renders when either signal changes. SSR-safe: false on the server and first client render.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(shouldReduceMotion());
    return onMotionPreferenceChange(setReduced);
  }, []);
  return reduced;
}

/** Passive, rAF-throttled `window.scrollY` for lightweight parallax. Returns 0 while inactive. */
export function useScrollOffset(active = true): number {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (!active) {
      setY(0);
      return;
    }
    let raf = 0;
    const tick = () => setY(window.scrollY);
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [active]);
  return active ? y : 0;
}

/** Translate for a parallax layer: `offset * speed`, clamped to ±`max` px. */
export function parallaxShift(offset: number, speed: number, max = Infinity): number {
  const shift = offset * speed;
  return Math.max(-max, Math.min(max, shift));
}

export interface TiltOptions {
  /** Max tilt in degrees at the edge. Default 8. */
  maxRotation?: number;
  /** Perspective in px. Default 1000. */
  perspective?: number;
  /** Scale while hovered. Default 1.02. */
  scale?: number;
  /** Ease-in time in ms (ease-out is 1.5×). Default 400. */
  speed?: number;
}

/** Tilt angles for a pointer at normalised (nx, ny), each -1..1 from the centre (clamped). */
export function tiltAngles(
  nx: number,
  ny: number,
  maxRotation: number,
): { rotateX: number; rotateY: number } {
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  const round = (v: number) => Math.round(v * 100) / 100 + 0;
  return { rotateX: round(-clamp(ny) * maxRotation), rotateY: round(clamp(nx) * maxRotation) };
}

/** 3D hover tilt that follows the pointer. Writes `style.transform` directly; off under reduced/paused motion. */
export function useTilt<T extends HTMLElement>(options: TiltOptions = {}): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { maxRotation = 8, perspective = 1000, scale = 1.02, speed = 400 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let rect: DOMRect | null = null;
    let raf = 0;
    const ease = 'cubic-bezier(0.25, 1, 0.5, 1)';

    const enter = () => {
      if (shouldReduceMotion()) return;
      el.style.transition = `transform ${speed}ms ${ease}`;
      rect = el.getBoundingClientRect();
    };
    const move = (event: PointerEvent) => {
      if (!rect || event.pointerType !== 'mouse') return;
      const box = rect;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nx = (event.clientX - box.left - box.width / 2) / (box.width / 2);
        const ny = (event.clientY - box.top - box.height / 2) / (box.height / 2);
        const { rotateX, rotateY } = tiltAngles(nx, ny, maxRotation);
        el.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
      });
    };
    const leave = () => {
      if (!rect) return;
      rect = null;
      cancelAnimationFrame(raf);
      el.style.transition = `transform ${speed * 1.5}ms ${ease}`;
      el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    };

    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
    };
  }, [maxRotation, perspective, scale, speed]);

  return ref;
}

/**
 * Sets `--mx` / `--my` (percent of the element box) as the pointer moves, for a spotlight or sheen
 * drawn in CSS, e.g. `radial-gradient(circle at var(--mx) var(--my), ...)`. Resets to the centre on
 * leave. Complements `MagneticButton`, which moves the element but does not set these.
 */
export function useSpotlightVars<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const centre = () => {
      el.style.setProperty('--mx', '50%');
      el.style.setProperty('--my', '50%');
    };
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      el.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    };
    centre();
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', centre);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', centre);
    };
  }, []);
  return ref;
}
