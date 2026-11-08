/**
 * Circular theme reveal: the new theme spreads in a circle from a point (usually the toggle that
 * was clicked) via a view transition. Without the API it falls back to a soft cross-fade class.
 * The DOM work is yours: `apply` switches the theme (data-theme, storage, state setters).
 *
 * Needs the CSS in `THEME_REVEAL_CSS` (or equivalent) in a global stylesheet.
 */
import { shouldReduceMotion } from '../motion-gate';

export interface RevealPoint {
  x: number;
  y: number;
}

export type RevealRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

export interface RevealThemeOptions {
  /** Class added to <html> while the circular reveal runs, so other view transitions keep their own motion. */
  revealClass?: string;
  /** Class added to <html> for the cross-fade fallback. */
  fadeClass?: string;
  /** How long the fade class stays on, in ms. */
  fadeMs?: number;
}

/** Radius that reaches the farthest viewport corner from (x, y). */
export function revealRadius(x: number, y: number, width: number, height: number): number {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}

/** Centre of a rect, or the point itself. */
export function revealOrigin(origin: RevealPoint | RevealRect): RevealPoint {
  if ('width' in origin)
    return { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 };
  return { x: origin.x, y: origin.y };
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    finished: Promise<void>;
    ready?: Promise<void>;
    updateCallbackDone?: Promise<void>;
  };
};

/**
 * Run `apply` with a circular reveal from `origin`. Instant under reduced motion or
 * `data-motion="paused"`. Resolves once the visual change has finished.
 */
export function revealTheme(
  apply: () => void,
  origin?: RevealPoint | RevealRect,
  options: RevealThemeOptions = {},
): Promise<void> {
  const { revealClass = 'theme-reveal', fadeClass = 'theme-fade', fadeMs = 700 } = options;
  if (typeof document === 'undefined' || shouldReduceMotion()) {
    apply();
    return Promise.resolve();
  }
  const root = document.documentElement;
  if (origin) {
    const { x, y } = revealOrigin(origin);
    root.style.setProperty('--reveal-x', `${x}px`);
    root.style.setProperty('--reveal-y', `${y}px`);
    root.style.setProperty(
      '--reveal-r',
      `${revealRadius(x, y, window.innerWidth, window.innerHeight)}px`,
    );
  }
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition === 'function') {
    root.classList.add(revealClass);
    const transition = doc.startViewTransition(apply);
    // A skipped transition rejects every promise; only `finished` is awaited, so silence the rest.
    transition.ready?.catch(() => undefined);
    transition.updateCallbackDone?.catch(() => undefined);
    return transition.finished
      .catch(() => undefined)
      .finally(() => root.classList.remove(revealClass));
  }
  root.classList.add(fadeClass);
  apply();
  return new Promise((resolve) => {
    window.setTimeout(() => {
      root.classList.remove(fadeClass);
      resolve();
    }, fadeMs);
  });
}

/** Global CSS the reveal relies on. Paste into a stylesheet, or inject it once. */
export const THEME_REVEAL_CSS = `
::view-transition-old(root),
::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
:root.theme-reveal::view-transition-new(root) {
  animation: arsenal-theme-reveal 0.78s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes arsenal-theme-reveal {
  from { clip-path: circle(0 at var(--reveal-x, 100%) var(--reveal-y, 0)); }
  to { clip-path: circle(var(--reveal-r, 150vmax) at var(--reveal-x, 100%) var(--reveal-y, 0)); }
}
.theme-fade, .theme-fade *, .theme-fade *::before, .theme-fade *::after {
  transition: background-color .65s cubic-bezier(.4,0,.2,1), color .65s cubic-bezier(.4,0,.2,1),
    border-color .65s cubic-bezier(.4,0,.2,1), fill .65s cubic-bezier(.4,0,.2,1),
    stroke .65s cubic-bezier(.4,0,.2,1), box-shadow .65s cubic-bezier(.4,0,.2,1) !important;
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-new(root) { animation: none !important; }
  .theme-fade, .theme-fade * { transition: none !important; }
}
`;
