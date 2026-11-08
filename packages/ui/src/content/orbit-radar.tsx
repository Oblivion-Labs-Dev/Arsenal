'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { useReduceMotion } from './use-reduce-motion';

export type OrbitRadarStatus = 'idle' | 'running' | 'done';

export interface OrbitRadarProps {
  status: OrbitRadarStatus;
  /** Icon in the core. Defaults to a bolt. */
  children?: ReactNode;
  /** Pixel size; default 48. */
  size?: number;
  /** Accessible status text, e.g. "Scanning job boards". */
  label?: string;
  className?: string;
}

function Bolt() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[45%]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

function spin(el: SVGElement | null, ms: number, reverse = false): Animation | undefined {
  return el?.animate(
    [{ transform: 'rotate(0deg)' }, { transform: `rotate(${reverse ? -360 : 360}deg)` }],
    {
      duration: ms,
      iterations: Infinity,
      easing: 'linear',
    },
  );
}

/** Small radar that sweeps while a background job runs: a status mark for scans and searches. */
export function OrbitRadar({ status, children, size = 48, label, className }: OrbitRadarProps) {
  const reduce = useReduceMotion();
  const gradientId = useId();
  const beam = useRef<SVGGElement>(null);
  const sat1 = useRef<SVGGElement>(null);
  const sat2 = useRef<SVGGElement>(null);
  const ping = useRef<SVGCircleElement>(null);
  const running = status === 'running';

  useEffect(() => {
    if (!running || reduce) return undefined;
    const runs = [
      spin(beam.current, 4000),
      spin(sat1.current, 6000),
      spin(sat2.current, 9000, true),
      ping.current?.animate(
        [
          { transform: 'scale(1)', opacity: 0.7 },
          { transform: 'scale(2.6)', opacity: 0 },
        ],
        { duration: 1600, iterations: Infinity, easing: 'cubic-bezier(0, 0, 0.2, 1)' },
      ),
    ];
    return () => runs.forEach((r) => r?.cancel());
  }, [running, reduce]);

  const rotor = '[transform-box:view-box] [transform-origin:100px_100px]';

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-status={status}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center text-arsenal-accent',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 rounded-full transition-opacity duration-500',
          'bg-[radial-gradient(circle,color-mix(in_srgb,var(--arsenal-accent)_28%,transparent)_0%,transparent_70%)]',
          running ? 'opacity-100' : 'opacity-40',
        )}
      />
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="100"
            y1="100"
            x2="176"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="var(--arsenal-border)" strokeWidth="2">
          <circle cx="100" cy="100" r="88" strokeDasharray="4 6" />
          <circle cx="100" cy="100" r="72" />
          <circle cx="100" cy="100" r="54" strokeDasharray="2 4" />
          <circle cx="100" cy="100" r="38" />
        </g>
        {running && (
          <>
            <g ref={beam} className={rotor}>
              <path d="M100 100 L100 12 A88 88 0 0 1 176 144 Z" fill={`url(#${gradientId})`} />
            </g>
            <g ref={sat1} className={rotor}>
              <circle
                ref={ping}
                cx="100"
                cy="28"
                r="6"
                fill="currentColor"
                className="[transform-box:fill-box] [transform-origin:center]"
              />
              <circle cx="100" cy="28" r="6" fill="currentColor" />
            </g>
            <g ref={sat2} className={rotor}>
              <circle cx="154" cy="100" r="5" fill="currentColor" opacity="0.7" />
            </g>
          </>
        )}
      </svg>
      <span
        className={cn(
          'relative flex size-[46%] items-center justify-center rounded-full border bg-arsenal-surface transition-colors duration-300',
          status === 'idle'
            ? 'border-arsenal-border text-arsenal-secondary'
            : 'border-arsenal-accent text-arsenal-accent',
        )}
      >
        {children ?? <Bolt />}
      </span>
    </span>
  );
}
