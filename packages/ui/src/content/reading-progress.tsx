'use client';

import { useEffect, useRef } from 'react';
import { cn } from '../lib/cn';
import { scrollProgress } from './reading';
import { useReduceMotion } from './use-reduce-motion';

export interface ReadingProgressProps {
  /**
   * Element whose reading progress is shown, e.g. "#article-body". Progress is measured from its
   * top reaching the top of the viewport to its bottom reaching the bottom. Omit for the whole page.
   */
  target?: string;
  className?: string;
}

/** Thin bar pinned to the top of the viewport that fills as the reader moves through the text. */
export function ReadingProgress({ target, className }: ReadingProgressProps) {
  const fill = useRef<HTMLSpanElement>(null);
  const reduce = useReduceMotion();

  useEffect(() => {
    if (reduce) return undefined;
    const el = target ? document.querySelector<HTMLElement>(target) : null;
    let frame = 0;
    const update = () => {
      frame = 0;
      let fraction: number;
      if (el) {
        const rect = el.getBoundingClientRect();
        fraction = scrollProgress(-rect.top, rect.height, window.innerHeight);
      } else {
        const root = document.documentElement;
        fraction = scrollProgress(root.scrollTop, root.scrollHeight, root.clientHeight);
      }
      if (fill.current) fill.current.style.transform = `scaleX(${fraction})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    el?.addEventListener('scroll', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      el?.removeEventListener('scroll', schedule);
    };
  }, [target, reduce]);

  if (reduce) return null;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[900] h-0.5 bg-arsenal-border',
        className,
      )}
    >
      <span
        ref={fill}
        className="block h-full origin-left bg-arsenal-accent"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
