'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';
import { usePrefersReducedMotion } from './pointer-hooks';

export interface StrokeLoopTiming {
  /** Seconds to draw the path. */
  draw: number;
  /** Seconds the full path holds. */
  hold: number;
  /** Seconds to erase the path. */
  erase: number;
  /** Seconds the empty canvas rests before the next loop. */
  empty: number;
}

export const DEFAULT_STROKE_LOOP_TIMING: StrokeLoopTiming = {
  draw: 3.9,
  hold: 1.05,
  erase: 3.6,
  empty: 0.95,
};

/** Total loop duration and the keyframe `times` (start, drawn, held, erased, end) as 0..1 fractions. */
export function strokeLoopTimes(timing: StrokeLoopTiming): { duration: number; times: number[] } {
  const duration = timing.draw + timing.hold + timing.erase + timing.empty;
  if (duration <= 0) return { duration: 0, times: [0, 0, 0, 0, 1] };
  const drawn = timing.draw / duration;
  const held = (timing.draw + timing.hold) / duration;
  const erased = (timing.draw + timing.hold + timing.erase) / duration;
  return { duration, times: [0, drawn, held, erased, 1] };
}

/** The infinity sign used by Thought-Loop-Explorer, sized for a 640×360 viewBox. */
export const INFINITY_PATH =
  'M 140 180 C 140 102 260 102 320 180 C 380 258 500 258 500 180 C 500 102 380 102 320 180 C 260 258 140 258 140 180';

export interface AnimatedStrokeLoopProps {
  /** SVG path data to draw. Defaults to an infinity sign. */
  d?: string;
  /** SVG viewBox. Default "0 0 640 360". */
  viewBox?: string;
  /** Gradient stops along the stroke, left to right. Any CSS color, including `var(--…)`. */
  colors?: readonly string[];
  /** Colour of the thin bright core line. */
  coreColor?: string;
  /** Stroke width of the main line (glow is 2×, core is 0.4×). Default 5.6. */
  strokeWidth?: number;
  timing?: StrokeLoopTiming;
  className?: string;
}

/**
 * A luminous line that draws itself along a path, holds, erases and loops: bloom layer, main
 * stroke and a bright core. Under reduced or paused motion it renders the finished line, still.
 * Decorative: hidden from assistive tech.
 */
export function AnimatedStrokeLoop({
  d = INFINITY_PATH,
  viewBox = '0 0 640 360',
  colors = ['var(--arsenal-accent)', 'var(--arsenal-accent-secondary, var(--arsenal-accent))'],
  coreColor = 'var(--arsenal-text-primary, currentColor)',
  strokeWidth = 5.6,
  timing = DEFAULT_STROKE_LOOP_TIMING,
  className,
}: AnimatedStrokeLoopProps) {
  const still = usePrefersReducedMotion();
  const idBase = useId().replace(/:/g, '');
  const gradientId = `${idBase}-stroke`;
  const bloomId = `${idBase}-bloom`;
  const { duration, times } = strokeLoopTimes(timing);
  const stops = colors.length > 0 ? colors : ['currentColor'];

  const layers = [
    {
      width: strokeWidth * 2,
      stroke: `url(#${gradientId})`,
      filter: `url(#${bloomId})`,
      peak: [0, 0.34, 0.34, 0.28, 0],
      rest: 0.34,
    },
    {
      width: strokeWidth,
      stroke: `url(#${gradientId})`,
      filter: undefined,
      peak: [0, 0.9, 0.9, 0.9, 0],
      rest: 0.9,
    },
    {
      width: strokeWidth * 0.4,
      stroke: coreColor,
      filter: undefined,
      peak: [0, 0.78, 0.8, 0.72, 0],
      rest: 0.78,
    },
  ];

  return (
    <svg viewBox={viewBox} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="10%" y1="52%" x2="90%" y2="48%">
          {stops.map((color, index) => (
            <stop
              key={`${color}-${index}`}
              offset={stops.length === 1 ? '0%' : `${(index / (stops.length - 1)) * 100}%`}
              style={{ stopColor: color }}
            />
          ))}
        </linearGradient>
        <filter id={bloomId} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {layers.map((layer, index) => (
        <motion.path
          key={`${index}-${still ? 'still' : 'loop'}`}
          d={d}
          pathLength={1}
          fill="none"
          stroke={layer.stroke}
          strokeWidth={layer.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={layer.filter}
          style={{ strokeDasharray: 1 }}
          initial={{ strokeDashoffset: still ? 0 : 1, opacity: still ? layer.rest : 0 }}
          animate={
            still
              ? { strokeDashoffset: 0, opacity: layer.rest }
              : { strokeDashoffset: [1, 0, 0, 1, 1], opacity: layer.peak }
          }
          transition={
            still ? { duration: 0 } : { duration, times, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      ))}
    </svg>
  );
}
