'use client';

import { useCallback, useEffect, useId, useRef, type RefObject } from 'react';
import { shouldReduceMotion } from '../motion-gate';

export interface PathSweepOverlayProps {
  /** Path the light travels along, in viewBox units. */
  d: string;
  /** Point that glows as the light arrives, in viewBox units. Omit for no tip glow. */
  tip?: { x: number; y: number };
  /** Coordinate space of `d` and `tip` (usually the pixel size of the art behind it). */
  viewBox: { width: number; height: number };
  /**
   * How the overlay maps onto its box. Match the background's `background-size/position`
   * (e.g. `cover` anchored right/bottom ⇔ "xMaxYMax slice") so the light stays on the art.
   */
  preserveAspectRatio?: string;
  /** Light colour. Default `var(--arsenal-accent)`. */
  color?: string;
  /** Stroke width in viewBox units. Default 14. */
  strokeWidth?: number;
  /** Radius of the tip glow in viewBox units. Default 70. */
  tipRadius?: number;
  /** Sweep duration in ms. Default 1600. */
  duration?: number;
  /** Delay before the first automatic play, ms. `null` disables autoplay. Default 450. */
  autoplayDelay?: number | null;
  /** Element whose pointerenter replays the sweep (e.g. the hero section). */
  hostRef?: RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * A single light that runs along a path drawn on top of static art (a chart arrow, a route, a
 * signature line) and blooms at its tip. Plays once on arrival and again when the reader points at
 * the host. Web Animations only; skipped under reduced or paused motion. Position the overlay
 * absolutely over the art (`absolute inset-0`).
 */
export function PathSweepOverlay({
  d,
  tip,
  viewBox,
  preserveAspectRatio = 'xMidYMid slice',
  color = 'var(--arsenal-accent)',
  strokeWidth = 14,
  tipRadius = 70,
  duration = 1600,
  autoplayDelay = 450,
  hostRef,
  className,
}: PathSweepOverlayProps) {
  const sweepRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const running = useRef(false);
  const idBase = useId().replace(/:/g, '');
  const softId = `${idBase}-soft`;
  const glowId = `${idBase}-glow`;

  const play = useCallback(() => {
    const sweep = sweepRef.current;
    if (!sweep || running.current || shouldReduceMotion() || typeof sweep.animate !== 'function')
      return;
    running.current = true;
    const sweepAnimation = sweep.animate(
      [
        { strokeDashoffset: 0.22, opacity: 0 },
        { opacity: 0.9, offset: 0.15 },
        { opacity: 0.9, offset: 0.8 },
        { strokeDashoffset: -1, opacity: 0 },
      ],
      { duration, easing: 'cubic-bezier(.45,.05,.35,1)' },
    );
    const tipEl = tipRef.current;
    const last = tipEl
      ? tipEl.animate(
          [
            { opacity: 0, transform: 'scale(0.7)' },
            { opacity: 0, transform: 'scale(0.7)', offset: 0.55 },
            { opacity: 0.85, transform: 'scale(1)', offset: 0.75 },
            { opacity: 0, transform: 'scale(1.15)' },
          ],
          { duration: duration + 900, easing: 'ease-out' },
        )
      : sweepAnimation;
    const done = () => {
      running.current = false;
    };
    last.onfinish = done;
    last.oncancel = done;
  }, [duration]);

  useEffect(() => {
    const host = hostRef?.current;
    const first = autoplayDelay === null ? undefined : window.setTimeout(play, autoplayDelay);
    host?.addEventListener('pointerenter', play);
    return () => {
      if (first !== undefined) window.clearTimeout(first);
      host?.removeEventListener('pointerenter', play);
    };
  }, [hostRef, play, autoplayDelay]);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden="true"
      focusable="false"
      style={{ pointerEvents: 'none', overflow: 'hidden' }}
    >
      <defs>
        <filter id={softId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <radialGradient id={glowId}>
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.95 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <path
        ref={sweepRef}
        d={d}
        pathLength={1}
        filter={`url(#${softId})`}
        style={{
          fill: 'none',
          stroke: color,
          strokeWidth,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeDasharray: '0.22 1.5',
          strokeDashoffset: 0.22,
          opacity: 0,
        }}
      />
      {tip ? (
        <circle
          ref={tipRef}
          cx={tip.x}
          cy={tip.y}
          r={tipRadius}
          fill={`url(#${glowId})`}
          style={{ opacity: 0, transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ) : null}
    </svg>
  );
}
