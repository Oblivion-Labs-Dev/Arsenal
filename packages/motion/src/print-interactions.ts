/**
 * Print interactions: headings rise in once as they enter the viewport, link underlines grow from
 * the side the pointer came in, and the page's CSS motion pauses while the tab is hidden.
 * Delegated listeners only: no timers, no animation loops, no content changes.
 *
 * Origin: amsborse.github.io redesign, `src/designs/broadsheet/effects.ts` (+ print rules in the
 * Broadsheet skin CSS). Lift-and-shift: copy this file and `print-interactions.css`.
 *
 * Guards kept: reduced motion (no reveals, no origins), fine hovering pointer only for the
 * underline origin, already-visible headings never wait for the observer, observation stops while
 * hidden, and cleanup removes only the classes and inline properties this module added.
 */
export interface PrintInteractionsOptions {
  /** Headings that rise in when they first scroll into view. */
  headingSelector?: string;
  /** Elements whose underline/hover grows from the side the pointer entered. */
  interactiveSelector?: string;
  /** Children of an interactive element that share its origin (e.g. a card title). */
  titleSelector?: string;
  /** Added to a heading once it has entered the viewport. */
  revealedClass?: string;
  /** Added to <body> while the document is hidden. */
  pausedClass?: string;
  /** Custom property that receives `left` or `right`. */
  originProperty?: string;
  /** Subtree watched for new headings (routes rendered later). Default: `document.body`. */
  root?: HTMLElement;
}

export const PRINT_INTERACTION_DEFAULTS = {
  headingSelector: 'main h2, .print-heading',
  interactiveSelector: 'a, .print-underline, .print-card',
  titleSelector: '.print-underline',
  revealedClass: 'print-revealed',
  pausedClass: 'print-paused',
  originProperty: '--print-origin',
} as const;

const CLASS_NAME = /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/;
const CUSTOM_PROPERTY = /^--[_a-zA-Z0-9-]+$/;

function assertSelector(name: string, selector: string) {
  if (selector.trim() === '') throw new TypeError(`mountPrintInteractions: ${name} is empty`);
  try {
    document.createDocumentFragment().querySelector(selector);
  } catch {
    throw new TypeError(`mountPrintInteractions: ${name} "${selector}" is not a valid selector`);
  }
}

/** Mount the interactions. Returns a cleanup function; calling it twice is safe. */
export function mountPrintInteractions(options: PrintInteractionsOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  const o = { ...PRINT_INTERACTION_DEFAULTS, ...options };
  assertSelector('headingSelector', o.headingSelector);
  assertSelector('interactiveSelector', o.interactiveSelector);
  assertSelector('titleSelector', o.titleSelector);
  const classes: ReadonlyArray<readonly [string, string]> = [
    ['revealedClass', o.revealedClass],
    ['pausedClass', o.pausedClass],
  ];
  for (const [name, value] of classes) {
    if (!CLASS_NAME.test(value)) {
      throw new TypeError(`mountPrintInteractions: ${name} "${value}" is not a valid class name`);
    }
  }
  if (!CUSTOM_PROPERTY.test(o.originProperty)) {
    throw new TypeError(
      `mountPrintInteractions: originProperty "${o.originProperty}" must be a custom property (--name)`,
    );
  }
  if (typeof window.matchMedia !== 'function') return () => undefined;

  const root = options.root ?? document.body;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const seen = new WeakSet<Element>();
  const addedClasses = new Map<Element, Set<string>>();
  const origins = new Map<HTMLElement, { value: string; priority: string; hadStyle: boolean }>();
  let observer: IntersectionObserver | undefined;
  let disposed = false;

  function addClass(element: Element, name: string) {
    if (element.classList.contains(name)) return;
    element.classList.add(name);
    const names = addedClasses.get(element) ?? new Set<string>();
    names.add(name);
    addedClasses.set(element, names);
  }

  function setOrigin(element: HTMLElement, origin: 'left' | 'right') {
    if (!origins.has(element)) {
      origins.set(element, {
        value: element.style.getPropertyValue(o.originProperty),
        priority: element.style.getPropertyPriority(o.originProperty),
        hadStyle: element.hasAttribute('style'),
      });
    }
    element.style.setProperty(o.originProperty, origin);
  }

  function setOriginWithTitles(element: HTMLElement, origin: 'left' | 'right') {
    setOrigin(element, origin);
    element
      .querySelectorAll<HTMLElement>(o.titleSelector)
      .forEach((title) => setOrigin(title, origin));
  }

  function onPointerEnter(event: PointerEvent) {
    if (
      document.hidden ||
      motion.matches ||
      !finePointer.matches ||
      event.pointerType === 'touch'
    ) {
      return;
    }
    const target = event.target;
    // pointerenter does not bubble, so it is captured; only the element actually entered counts.
    if (!(target instanceof HTMLElement) || !target.matches(o.interactiveSelector)) return;
    const rect = target.getBoundingClientRect();
    setOriginWithTitles(target, event.clientX < rect.left + rect.width / 2 ? 'left' : 'right');
  }

  function onFocus(event: FocusEvent) {
    if (event.target instanceof HTMLElement) setOriginWithTitles(event.target, 'left');
  }

  function discover() {
    if (disposed || document.hidden) return;
    root.querySelectorAll(o.headingSelector).forEach((heading) => {
      if (seen.has(heading)) return;
      seen.add(heading);
      const rect = heading.getBoundingClientRect();
      // Headings already on screen never wait for an asynchronous observer callback.
      if (motion.matches || !observer || (rect.top < window.innerHeight && rect.bottom >= 0))
        return;
      observer.observe(heading);
    });
  }

  function configure() {
    observer?.disconnect();
    observer = undefined;
    if (
      !disposed &&
      !motion.matches &&
      !document.hidden &&
      typeof IntersectionObserver !== 'undefined'
    ) {
      const io = new IntersectionObserver(
        (entries) => {
          if (document.hidden || motion.matches) return;
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            addClass(entry.target, o.revealedClass);
            io.unobserve(entry.target);
          });
        },
        { threshold: 0 },
      );
      observer = io;
      // Reconnect headings that were waiting below the fold when visibility or preferences changed.
      root.querySelectorAll(o.headingSelector).forEach((heading) => {
        if (heading.classList.contains(o.revealedClass)) return;
        if (heading.getBoundingClientRect().top >= window.innerHeight) io.observe(heading);
      });
    }
    discover();
  }

  function onVisibility() {
    if (document.hidden) addClass(document.body, o.pausedClass);
    else if (addedClasses.get(document.body)?.delete(o.pausedClass)) {
      document.body.classList.remove(o.pausedClass);
    }
    configure();
  }

  const mutations =
    typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(discover);
  mutations?.observe(root, { childList: true, subtree: true });
  document.addEventListener('pointerenter', onPointerEnter, true);
  document.addEventListener('focusin', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', configure);
  onVisibility();

  return () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    mutations?.disconnect();
    document.removeEventListener('pointerenter', onPointerEnter, true);
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    motion.removeEventListener('change', configure);
    addedClasses.forEach((names, element) =>
      names.forEach((name) => element.classList.remove(name)),
    );
    addedClasses.clear();
    origins.forEach(({ value, priority, hadStyle }, element) => {
      if (value) element.style.setProperty(o.originProperty, value, priority);
      else element.style.removeProperty(o.originProperty);
      if (!hadStyle && element.getAttribute('style') === '') element.removeAttribute('style');
    });
    origins.clear();
  };
}
