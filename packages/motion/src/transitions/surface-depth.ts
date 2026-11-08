'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { shouldReduceMotion } from '../motion-gate';

export interface SurfaceDepthOptions {
  /** Max tilt in degrees at the element's edge. Default 2. */
  maxTilt?: number;
  /** Lift in px while the pointer is over the surface. Default 2. */
  lift?: number;
  /** Perspective in px. Default 900. */
  perspective?: number;
}

/** CSS transform for a pointer at normalised position (x, y), each in -0.5..0.5 from centre. */
export function surfaceDepthTransform(
  x: number,
  y: number,
  options: SurfaceDepthOptions = {},
): string {
  const { maxTilt = 2, lift = 2, perspective = 900 } = options;
  const rx = -y * maxTilt;
  const ry = x * maxTilt;
  return `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(${-lift}px)`;
}

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/**
 * Subtle pointer-driven depth for a card or panel, written straight to `style.transform` so pointer
 * movement causes no React renders. Mouse only, fine pointers only, off under reduced/paused
 * motion. When `version` changes the surface briefly brightens, to show its content just updated.
 */
export function useSurfaceDepth<T extends HTMLElement = HTMLElement>(
  version?: string,
  options: SurfaceDepthOptions = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const previous = useRef(version);
  const { maxTilt = 2, lift = 2, perspective = 900 } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const allowed = () =>
      typeof matchMedia === 'function' && matchMedia(FINE_POINTER).matches && !shouldReduceMotion();
    const reset = () => element.style.removeProperty('transform');
    const move = (event: PointerEvent) => {
      if (!allowed() || event.pointerType !== 'mouse') {
        reset();
        return;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      element.style.transform = surfaceDepthTransform(x, y, { maxTilt, lift, perspective });
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerleave', reset);
    return () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', reset);
      reset();
    };
  }, [maxTilt, lift, perspective]);

  useEffect(() => {
    const element = ref.current;
    const changed = previous.current !== version;
    previous.current = version;
    if (!changed || !element || typeof element.animate !== 'function' || shouldReduceMotion())
      return;
    const animation = element.animate(
      [{ filter: 'brightness(1.12)' }, { filter: 'brightness(1)' }],
      {
        duration: 650,
      },
    );
    return () => animation.cancel();
  }, [version]);

  return ref;
}
