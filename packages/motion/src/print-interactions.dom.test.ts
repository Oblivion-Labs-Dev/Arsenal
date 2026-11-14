// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPrintInteractions } from './print-interactions';

type Media = { matches: boolean; listeners: Set<() => void> };
let media: Record<string, Media> = {};

function stubMatchMedia({ fine = true, reduced = false } = {}) {
  media = {
    '(hover: hover) and (pointer: fine)': { matches: fine, listeners: new Set() },
    '(prefers-reduced-motion: reduce)': { matches: reduced, listeners: new Set() },
  };
  vi.stubGlobal('matchMedia', (query: string) => {
    const entry = (media[query] ??= { matches: false, listeners: new Set() });
    return {
      get matches() {
        return entry.matches;
      },
      addEventListener: (_: string, cb: () => void) => entry.listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => entry.listeners.delete(cb),
    };
  });
}

class StubIO {
  static instances: StubIO[] = [];
  observed = new Set<Element>();
  disconnected = false;
  constructor(private readonly callback: IntersectionObserverCallback) {
    StubIO.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.disconnected = true;
    this.observed.clear();
  }
  enter(el: Element) {
    this.callback(
      [{ target: el, isIntersecting: true } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}
const liveObserver = () => StubIO.instances.filter((io) => !io.disconnected).at(-1);

function heading(top: number, text = 'Title') {
  const h = document.createElement('h2');
  h.textContent = text;
  h.getBoundingClientRect = () =>
    ({ top, bottom: top + 40, left: 0, right: 200, width: 200, height: 40 }) as DOMRect;
  document.querySelector('main')!.append(h);
  return h;
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

function pointerEnter(target: Element, clientX: number, pointerType = 'mouse') {
  const event = new MouseEvent('pointerenter', { clientX });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
}

let stop: () => void = () => undefined;
beforeEach(() => {
  StubIO.instances = [];
  vi.stubGlobal('IntersectionObserver', StubIO);
  stubMatchMedia();
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.body.innerHTML = '<main></main>';
});
afterEach(() => {
  stop();
  stop = () => undefined;
  vi.unstubAllGlobals();
  document.body.className = '';
});

describe('mountPrintInteractions', () => {
  it('rejects empty or invalid selectors, class names and origin properties', () => {
    expect(() => mountPrintInteractions({ headingSelector: '  ' })).toThrow(TypeError);
    expect(() => mountPrintInteractions({ interactiveSelector: 'a[' })).toThrow(TypeError);
    expect(() => mountPrintInteractions({ revealedClass: 'has space' })).toThrow(TypeError);
    expect(() => mountPrintInteractions({ originProperty: 'origin' })).toThrow(TypeError);
  });

  it('reveals below-the-fold headings on entry and never observes visible ones', () => {
    const visible = heading(100);
    const below = heading(1200);
    stop = mountPrintInteractions();
    const io = liveObserver()!;
    expect(io.observed.has(visible)).toBe(false);
    expect(io.observed.has(below)).toBe(true);
    io.enter(below);
    expect(below.classList.contains('print-revealed')).toBe(true);
    expect(io.observed.has(below)).toBe(false);
    expect(visible.classList.contains('print-revealed')).toBe(false);
  });

  it('picks up headings rendered later', async () => {
    stop = mountPrintInteractions({ headingSelector: '.late' });
    const late = document.createElement('h3');
    late.className = 'late';
    late.getBoundingClientRect = () => ({ top: 2000, bottom: 2040 }) as DOMRect;
    document.querySelector('main')!.append(late);
    await new Promise((r) => setTimeout(r, 0));
    expect(liveObserver()!.observed.has(late)).toBe(true);
  });

  it('observes nothing under reduced motion', () => {
    stubMatchMedia({ reduced: true });
    heading(1200);
    stop = mountPrintInteractions();
    expect(StubIO.instances).toHaveLength(0);
  });

  it('sets the underline origin from the side the pointer entered, with its titles', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<a class="card" href="#"><span class="print-underline">T</span></a>',
    );
    const link = document.querySelector<HTMLElement>('a.card')!;
    link.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
    stop = mountPrintInteractions();
    pointerEnter(link, 150);
    expect(link.style.getPropertyValue('--print-origin')).toBe('right');
    expect(
      link.querySelector<HTMLElement>('.print-underline')!.style.getPropertyValue('--print-origin'),
    ).toBe('right');
    pointerEnter(link, 20);
    expect(link.style.getPropertyValue('--print-origin')).toBe('left');
  });

  it('ignores touch and coarse pointers', () => {
    document.body.insertAdjacentHTML('beforeend', '<a href="#">x</a>');
    const link = document.querySelector<HTMLElement>('a')!;
    link.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
    stop = mountPrintInteractions();
    pointerEnter(link, 150, 'touch');
    expect(link.hasAttribute('style')).toBe(false);
    stop();
    stubMatchMedia({ fine: false });
    stop = mountPrintInteractions();
    pointerEnter(link, 150);
    expect(link.hasAttribute('style')).toBe(false);
  });

  it('pauses while hidden and re-observes waiting headings when visible again', () => {
    const below = heading(1200);
    stop = mountPrintInteractions();
    setHidden(true);
    expect(document.body.classList.contains('print-paused')).toBe(true);
    expect(liveObserver()).toBeUndefined();
    setHidden(false);
    expect(document.body.classList.contains('print-paused')).toBe(false);
    expect(liveObserver()!.observed.has(below)).toBe(true);
  });

  it('cleanup removes only what it added and restores prior origins', () => {
    document.body.classList.add('print-paused'); // owned by the page, not by us
    document.body.insertAdjacentHTML(
      'beforeend',
      '<a id="a" href="#">a</a><a id="b" href="#" style="--print-origin: center">b</a>',
    );
    const a = document.getElementById('a')!;
    const b = document.getElementById('b')!;
    for (const el of [a, b]) el.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;
    const below = heading(1200);
    stop = mountPrintInteractions();
    pointerEnter(a, 150);
    pointerEnter(b, 150);
    liveObserver()!.enter(below);
    stop();
    stop();
    expect(a.hasAttribute('style')).toBe(false);
    expect(b.style.getPropertyValue('--print-origin').trim()).toBe('center');
    expect(below.classList.contains('print-revealed')).toBe(false);
    expect(document.body.classList.contains('print-paused')).toBe(true);
    expect(StubIO.instances.every((io) => io.disconnected)).toBe(true);
    expect(media['(prefers-reduced-motion: reduce)'].listeners.size).toBe(0);
  });
});
