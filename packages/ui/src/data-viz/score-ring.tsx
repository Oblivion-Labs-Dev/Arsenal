import { useEffect, useRef, useState } from 'react';
import { shouldReduceMotion } from '@arsenal/motion';
import { cn } from '../lib/cn';
import { tweenValue } from './math';
import { useInViewActive } from './use-in-view-active';

export interface ScoreRingProps {
  /** Score out of `max`. `null` shows "?" and an empty ring. */
  score: number | null;
  max?: number;
  /** Accessible name, e.g. "Quality score". */
  label: string;
  /** Plain-language meaning, appended to the accessible name ("72 of 100, strong"). */
  meaning?: string;
  /** Rendered size in px. */
  size?: number;
  /** Fill from 0 the first time the ring scrolls into view. */
  animateOnEntry?: boolean;
  className?: string;
}

const R = 22;
const C = 2 * Math.PI * R;
const ENTRY_MS = 680;

/**
 * Compact circular score. Distinct from ScoreGauge (the larger dial): this is a small inline ring
 * that animates in when it first enters the viewport.
 */
export function ScoreRing({
  score,
  max = 100,
  label,
  meaning,
  size = 64,
  animateOnEntry = true,
  className,
}: ScoreRingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useInViewActive(ref);
  const known = score !== null && Number.isFinite(score) && max > 0;
  const target = known ? Math.min(1, Math.max(0, score / max)) : 0;
  const [shown, setShown] = useState(animateOnEntry ? 0 : target);
  const entered = useRef(!animateOnEntry);

  useEffect(() => {
    if (entered.current || shouldReduceMotion()) {
      entered.current = true;
      setShown(target);
      return undefined;
    }
    if (!active) return undefined;
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const p = Math.min(1, (now - start) / ENTRY_MS);
      setShown(tweenValue(0, target, p));
      if (p < 1) frame = requestAnimationFrame(tick);
      else entered.current = true;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  const spoken = known
    ? `${label}: ${score} of ${max}${meaning ? `, ${meaning}` : ''}`
    : `${label}: unknown`;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={spoken}
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 52 52" width={size} height={size} aria-hidden="true">
        <circle cx={26} cy={26} r={R} fill="none" stroke="var(--arsenal-border)" strokeWidth={4} />
        {known ? (
          <circle
            cx={26}
            cy={26}
            r={R}
            fill="none"
            stroke="var(--arsenal-accent)"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - shown)}
            transform="rotate(-90 26 26)"
            style={{ transition: 'stroke-dashoffset 380ms var(--arsenal-ease-out, ease-out)' }}
          />
        ) : null}
      </svg>
      <span
        aria-hidden="true"
        className="absolute text-[0.95em] font-semibold tabular-nums text-[var(--arsenal-text-primary)]"
      >
        {known ? Math.round(score) : '?'}
      </span>
    </div>
  );
}
