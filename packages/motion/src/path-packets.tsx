"use client";
/**
 * Packets that walk a sequence of SVG paths one leg at a time, in a seamless loop: one dot per
 * leg, each visible only during its slice of the trip (SMIL keyPoints/keyTimes, no JS per frame).
 *
 * Origin: amsborse.github.io redesign, `src/designs/blueprint/HeroDrawing.tsx` (request packet).
 * Lift-and-shift: copy this file. Render it inside an <svg>; skip it under reduced motion and pair
 * it with `usePauseSvgOffscreen` so the loop stops off screen.
 */
import type { SVGProps } from "react";

export interface PathPacketsProps {
  /** Path data (`d`) of each leg, in travel order. */
  paths: readonly string[];
  /** Seconds each leg takes. */
  legSeconds?: number;
  /** Delay before the first trip (lets a draw-in finish first). */
  beginSeconds?: number;
  radius?: number;
  className?: string;
  circleProps?: Omit<SVGProps<SVGCircleElement>, "r" | "className">;
}

export interface PacketTiming {
  start: number;
  end: number;
}

const round = (n: number) => Number(n.toFixed(4));

/** Normalised [start, end] of each leg within one loop. */
export function packetTimings(legs: number): PacketTiming[] {
  if (!Number.isInteger(legs) || legs < 0) {
    throw new RangeError(`packetTimings: legs must be a non-negative integer (got ${legs})`);
  }
  return Array.from({ length: legs }, (_, i) => ({ start: round(i / legs), end: round((i + 1) / legs) }));
}

export function PathPackets({
  paths,
  legSeconds = 0.85,
  beginSeconds = 1.4,
  radius = 4.5,
  className = "arsenal-path-packet",
  circleProps,
}: PathPacketsProps) {
  if (!(legSeconds > 0) || !Number.isFinite(legSeconds)) {
    throw new RangeError(`PathPackets: legSeconds must be a positive number (got ${legSeconds})`);
  }
  if (!(beginSeconds >= 0) || !Number.isFinite(beginSeconds)) {
    throw new RangeError(`PathPackets: beginSeconds must be >= 0 (got ${beginSeconds})`);
  }
  if (paths.length === 0) return null;
  const total = `${round(paths.length * legSeconds)}s`;
  const begin = `${beginSeconds}s`;
  return (
    <g aria-hidden="true">
      {packetTimings(paths.length).map(({ start, end }, i) => {
        // Edge cases: a single leg spans 0..1, so keyTimes collapse to 0;0;1;1 (still strictly ordered via the epsilon).
        const fadeIn = round(Math.min(start + 0.004, end));
        const fadeOut = round(Math.max(end - 0.004, fadeIn));
        return (
          <circle key={i} r={radius} className={className} opacity={0} {...circleProps}>
            <animateMotion
              dur={total}
              repeatCount="indefinite"
              path={paths[i]}
              keyPoints="0;0;1;1"
              keyTimes={`0;${start};${end};1`}
              calcMode="linear"
              begin={begin}
            />
            <animate
              attributeName="opacity"
              dur={total}
              repeatCount="indefinite"
              values="0;0;1;1;0;0"
              keyTimes={`0;${start};${fadeIn};${fadeOut};${end};1`}
              begin={begin}
            />
          </circle>
        );
      })}
    </g>
  );
}
