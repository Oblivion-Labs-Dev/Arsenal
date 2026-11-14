"use client";
/**
 * Pause an SVG's SMIL animations (<animate>, <animateMotion>) while it is off screen or the tab
 * is hidden, and resume them when it comes back.
 *
 * Origin: amsborse.github.io redesign, `src/designs/blueprint/HeroDrawing.tsx` (useEffect).
 * Lift-and-shift: copy this file.
 */
import { useEffect, type RefObject } from "react";

/** Imperative form, for non-React callers. Returns a cleanup function. */
export function pauseSvgOffscreen(svg: SVGSVGElement): () => void {
  if (typeof IntersectionObserver === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }
  let visible = false;
  const apply = () => {
    if (visible && !document.hidden) svg.unpauseAnimations();
    else svg.pauseAnimations();
  };
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (!entry) return;
    visible = entry.isIntersecting;
    apply();
  });
  observer.observe(svg);
  document.addEventListener("visibilitychange", apply);
  return () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", apply);
  };
}

/** React form. Pass `enabled = false` (e.g. under reduced motion, when there is nothing to animate) to skip it. */
export function usePauseSvgOffscreen(ref: RefObject<SVGSVGElement | null>, enabled = true): void {
  useEffect(() => {
    const svg = ref.current;
    if (!svg || !enabled) return;
    return pauseSvgOffscreen(svg);
  }, [ref, enabled]);
}
