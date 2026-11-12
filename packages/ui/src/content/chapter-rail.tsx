'use client';

// One chapter rail for long pages, merged from Sutra's `ChapterRail` (last-visible-wins and
// page-end rules, beads) and the portfolio's rail (scroll-linked fill, dense mode, labels on
// hover). Tracking lives in `useActiveSection`, progress reuses `scrollProgress`, and reduced
// motion comes from `useReduceMotion`, so no framer-motion scroll hooks are needed.

import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { cn } from '../lib/cn';
import {
  chapterFill,
  RAIL_DENSE_AFTER,
  railKeyTarget,
  type RailChapter,
} from './chapter-rail-logic';
import { scrollProgress } from './reading';
import { useActiveSection } from './use-active-section';
import { useReduceMotion } from './use-reduce-motion';

export interface ChapterRailProps {
  /** Sections in page order; each `id` must match an element id on the page. */
  chapters: readonly RailChapter[];
  /** Accessible name of the navigation. */
  label?: string;
  /** Controlled current chapter; omit to track the section in the middle of the viewport. */
  activeId?: string;
  /**
   * What fills the line: `'chapters'` (default) steps from stop to stop, `'scroll'` follows page
   * scroll, a selector such as `"#article"` follows that element, `false` shows no fill.
   */
  progress?: 'chapters' | 'scroll' | false | (string & {});
  /** `fixed` pins the rail to the viewport's right edge; `sticky` keeps it in its column. */
  placement?: 'fixed' | 'sticky';
  /** Hide the compact pill shown below the rail's breakpoint. Default false. */
  hideCompact?: boolean;
  className?: string;
}

function goTo(id: string, reduce: boolean) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  history.replaceState(null, '', `#${id}`);
}

/** Vertical chapter navigation with an active stop, keyboard support and a mobile pill. */
export function ChapterRail({
  chapters,
  label = 'Chapters on this page',
  activeId,
  progress = 'chapters',
  placement = 'fixed',
  hideCompact = false,
  className,
}: ChapterRailProps) {
  const ids = chapters.map((c) => c.id);
  const tracked = useActiveSection(activeId === undefined ? ids : []);
  const current = activeId ?? tracked;
  const reduce = useReduceMotion();
  const fill = useRef<HTMLSpanElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);

  const index = Math.max(0, ids.indexOf(current ?? ''));
  const scrollLinked = progress !== false && progress !== 'chapters';

  useEffect(() => {
    if (!scrollLinked) return undefined;
    const el = progress === 'scroll' ? null : document.querySelector<HTMLElement>(progress);
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
      fill.current?.style.setProperty('--rail-fill', String(fraction));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [scrollLinked, progress]);

  if (chapters.length === 0) return null;

  const dense = chapters.length > RAIL_DENSE_AFTER;
  const onClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    goTo(id, reduce);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const from = links.current.indexOf(document.activeElement as HTMLAnchorElement);
    if (from < 0) return;
    const to = railKeyTarget(event.key, from, chapters.length);
    if (to === null) return;
    event.preventDefault();
    links.current[to]?.focus();
  };
  const step = (delta: number) => {
    const next = chapters[Math.min(chapters.length - 1, Math.max(0, index + delta))];
    if (next) goTo(next.id, reduce);
  };
  const currentChapter = chapters[index];

  return (
    <>
      <nav
        aria-label={label}
        className={cn('arsenal-chapter-rail', className)}
        data-placement={placement}
        data-dense={dense ? 'true' : undefined}
        style={{ '--rail-count': chapters.length } as CSSProperties}
        onKeyDown={onKeyDown}
      >
        {progress !== false && (
          <span aria-hidden className="arsenal-chapter-rail__track">
            <span
              ref={fill}
              className="arsenal-chapter-rail__fill"
              style={
                scrollLinked
                  ? undefined
                  : ({ '--rail-fill': chapterFill(index, chapters.length) } as CSSProperties)
              }
            />
          </span>
        )}
        <ol className="arsenal-chapter-rail__stops">
          {chapters.map((chapter, i) => {
            const isCurrent = i === index && current !== undefined;
            return (
              <li key={chapter.id}>
                <a
                  ref={(el) => {
                    links.current[i] = el;
                  }}
                  href={`#${chapter.id}`}
                  className="arsenal-chapter-rail__stop"
                  aria-current={isCurrent ? 'location' : undefined}
                  data-passed={i < index ? 'true' : undefined}
                  title={dense ? chapter.label : undefined}
                  onClick={(e) => onClick(e, chapter.id)}
                >
                  <span className="arsenal-chapter-rail__label">{chapter.label}</span>
                  <span aria-hidden className="arsenal-chapter-rail__dot" />
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
      {!hideCompact && currentChapter && (
        <div className="arsenal-chapter-rail-compact" role="navigation" aria-label={label}>
          <button
            type="button"
            className="arsenal-chapter-rail-compact__step"
            aria-label="Previous chapter"
            disabled={index === 0}
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <span className="arsenal-chapter-rail-compact__now" aria-live="polite">
            <span className="arsenal-chapter-rail-compact__title">{currentChapter.label}</span>
            <span className="arsenal-chapter-rail-compact__count">
              {index + 1} / {chapters.length}
            </span>
          </span>
          <button
            type="button"
            className="arsenal-chapter-rail-compact__step"
            aria-label="Next chapter"
            disabled={index === chapters.length - 1}
            onClick={() => step(1)}
          >
            ›
          </button>
          <span
            aria-hidden
            className="arsenal-chapter-rail-compact__fill"
            style={{ '--rail-fill': chapterFill(index, chapters.length) } as CSSProperties}
          />
        </div>
      )}
    </>
  );
}
