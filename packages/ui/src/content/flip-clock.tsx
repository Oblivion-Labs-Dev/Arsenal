'use client';

import { useEffect, useRef, useState } from 'react';
import { shouldReduceMotion } from '@arsenal/motion';
import { cn } from '../lib/cn';
import { clockFace, type ClockOptions } from './flip-clock-format';

export interface FlipClockProps extends ClockOptions {
  className?: string;
  /** Cell size scale; 1 = 60×104px digit cells. */
  scale?: number;
}

const FLIP_MS = 560;
const FLIP_EASE = 'cubic-bezier(0.45, 0, 0.75, 0.4)';

/** One digit cell: the page that leaves folds down about its top edge, revealing the new one. */
function DigitCell({ value, scale }: { value: string; scale: number }) {
  const [pages, setPages] = useState<{ current: string; leaving: string | null }>({
    current: value,
    leaving: null,
  });
  const leavingRef = useRef<HTMLSpanElement>(null);
  const shadeRef = useRef<HTMLSpanElement>(null);
  const arrivingShadeRef = useRef<HTMLSpanElement>(null);

  if (value !== pages.current) {
    const animate = typeof document !== 'undefined' && !document.hidden && !shouldReduceMotion();
    setPages({ current: value, leaving: animate ? pages.current : null });
  }

  useEffect(() => {
    const leaving = leavingRef.current;
    if (!pages.leaving || !leaving) return undefined;
    const options: KeyframeAnimationOptions = {
      duration: FLIP_MS,
      easing: FLIP_EASE,
      fill: 'forwards',
    };
    const flip = leaving.animate(
      [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(96deg)' }],
      options,
    );
    const shade = shadeRef.current?.animate([{ opacity: 0 }, { opacity: 0.6 }], options);
    const unshade = arrivingShadeRef.current?.animate([{ opacity: 0.45 }, { opacity: 0 }], options);
    const done = () => setPages((p) => (p.leaving ? { current: p.current, leaving: null } : p));
    flip.onfinish = done;
    // Backgrounded tabs can stall animations; never leave a page stuck mid-flip.
    const fallback = setTimeout(done, FLIP_MS + 340);
    return () => {
      clearTimeout(fallback);
      flip.cancel();
      shade?.cancel();
      unshade?.cancel();
    };
  }, [pages.leaving]);

  const page =
    'absolute inset-0 flex items-center justify-center overflow-hidden rounded-[inherit] bg-arsenal-elevated [backface-visibility:hidden]';

  return (
    <span
      className={cn(
        'relative inline-block rounded-[12px] border border-arsenal-border font-semibold tabular-nums text-arsenal-primary',
        'shadow-[0_10px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] [perspective:420px]',
        // Metal hinge tab across the middle.
        "before:absolute before:inset-x-0 before:top-1/2 before:z-10 before:h-px before:bg-[color-mix(in_srgb,var(--arsenal-background)_70%,transparent)] before:content-['']",
      )}
      style={{ width: 60 * scale, height: 104 * scale, fontSize: 72 * scale, lineHeight: 1 }}
    >
      <span className={page}>
        {pages.current}
        <span
          ref={arrivingShadeRef}
          className="pointer-events-none absolute inset-0 bg-black opacity-0"
        />
      </span>
      {pages.leaving !== null && (
        <span ref={leavingRef} className={cn(page, 'origin-top')}>
          {pages.leaving}
          <span
            ref={shadeRef}
            className="pointer-events-none absolute inset-0 bg-black opacity-0"
          />
        </span>
      )}
    </span>
  );
}

/** A live split-flap clock. Digits flip only when they change; reduced motion swaps them in place. */
export function FlipClock({ className, scale = 1, ...options }: FlipClockProps) {
  const { hour12, seconds, locale, timeZone } = options;
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      // Align to the next whole second so every digit changes on the beat.
      timer = setTimeout(tick, 1000 - d.getMilliseconds() + 5);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  // Rendered only on the client so server and first client render agree.
  if (!now)
    return (
      <span className={cn('inline-block', className)} aria-hidden style={{ height: 104 * scale }} />
    );
  const face = clockFace(now, { hour12, seconds, locale, timeZone });

  return (
    <span
      role="timer"
      aria-label={face.label}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <span aria-hidden className="inline-flex items-center" style={{ gap: 8 * scale }}>
        {face.chars.map((ch, i) =>
          /\d/.test(ch) ? (
            <DigitCell key={`${face.shape}-${i}`} value={ch} scale={scale} />
          ) : (
            <span
              key={`${face.shape}-${i}`}
              className="font-semibold text-arsenal-secondary opacity-70"
              style={{ fontSize: 56 * scale }}
            >
              {ch}
            </span>
          ),
        )}
        {face.period ? (
          <small
            className="self-end font-medium uppercase tracking-wider text-arsenal-secondary"
            style={{ fontSize: 16 * scale }}
          >
            {face.period}
          </small>
        ) : null}
      </span>
    </span>
  );
}
