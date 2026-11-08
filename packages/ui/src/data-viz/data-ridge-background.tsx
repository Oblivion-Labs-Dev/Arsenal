import { useEffect, useId, useRef, type ReactNode } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '@arsenal/motion';
import { cn } from '../lib/cn';
import { ridgePath } from './math';
import { useInViewActive } from './use-in-view-active';

export interface DataRidgeSeries {
  /** What the ridge shows, e.g. "Portfolio value". */
  label: string;
  /** Start of the period, shown in the caption. */
  from: string;
  /** End of the period, shown in the caption. */
  to: string;
  values: number[];
}

export interface DataRidgeBackgroundProps {
  /** Real data for the front ridge. Without it the front ridge is a decorative default. */
  series?: DataRidgeSeries;
  children?: ReactNode;
  className?: string;
}

const FAR_A =
  'M0 104 L85 72 145 91 218 54 304 96 390 63 472 94 554 56 636 98 733 58 825 91 906 52 1000 84 V150 H0Z';
const FAR_B =
  'M0 119 L106 91 188 110 285 71 365 112 452 78 543 112 625 73 719 116 810 78 911 108 1000 72 V150 H0Z';
const FRONT_DEFAULT =
  'M0 126 L75 112 145 120 225 99 300 122 374 102 448 117 520 91 598 117 678 96 755 120 830 101 916 115 1000 94';

/**
 * Atmospheric ridge-line backdrop: two far ridges drift slowly behind a front ridge that can carry
 * real data. Drift pauses offscreen, in hidden tabs and under reduced motion.
 */
export function DataRidgeBackground({ series, children, className }: DataRidgeBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const farA = useRef<SVGPathElement>(null);
  const farB = useRef<SVGPathElement>(null);
  const active = useInViewActive(rootRef);
  const uid = useId().replace(/:/g, '');
  const maskId = `arsenal-ridge-mask-${uid}`;
  const fadeId = `arsenal-ridge-fade-${uid}`;
  const glowId = `arsenal-ridge-glow-${uid}`;
  const front = (series && ridgePath(series.values)) || FRONT_DEFAULT;

  useEffect(() => {
    const a = farA.current;
    const b = farB.current;
    if (!a || !b || typeof a.animate !== 'function') return undefined;
    const animA = a.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(1.2%,-1%,0)' }],
      { duration: 78_000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' },
    );
    const animB = b.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(-1%,0.7%,0)' }],
      { duration: 64_000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' },
    );
    const sync = () => {
      const run = active && !shouldReduceMotion();
      for (const anim of [animA, animB]) {
        if (run) anim.play();
        else anim.pause();
      }
    };
    sync();
    const off = onMotionPreferenceChange(sync);
    return () => {
      off();
      animA.cancel();
      animB.cancel();
    };
  }, [active]);

  return (
    <div ref={rootRef} className={cn('relative isolate overflow-hidden', className)}>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1000 150"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={fadeId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={0} />
            <stop offset="30%" stopColor="#fff" stopOpacity={1} />
            <stop offset="85%" stopColor="#fff" stopOpacity={1} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id={maskId}>
            <rect width="1000" height="150" fill={`url(#${fadeId})`} />
          </mask>
          <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="var(--arsenal-accent)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--arsenal-accent)" stopOpacity={0} />
          </radialGradient>
        </defs>
        <g mask={`url(#${maskId})`}>
          <ellipse cx="620" cy="70" rx="420" ry="90" fill={`url(#${glowId})`} />
          <path ref={farA} d={FAR_A} fill="var(--arsenal-accent-violet)" opacity={0.08} />
          <path ref={farB} d={FAR_B} fill="var(--arsenal-accent-cyan)" opacity={0.07} />
          <path
            d={front}
            fill="none"
            stroke="var(--arsenal-accent)"
            strokeWidth={1.6}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.7}
          />
        </g>
      </svg>
      {series ? (
        <p className="pointer-events-none absolute bottom-2 right-3 z-[1] m-0 text-xs text-[var(--arsenal-text-secondary)]">
          {series.label} · {series.from} – {series.to}
          <span className="sr-only">: {series.values.join(', ')}</span>
        </p>
      ) : null}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
