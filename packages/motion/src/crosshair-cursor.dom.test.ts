// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountCrosshairCursor } from './crosshair-cursor';

type Media = { matches: boolean; listeners: Set<() => void> };
const media: Record<string, Media> = {};

function stubMatchMedia({ fine = true, reduced = false } = {}) {
  media['(hover: hover) and (pointer: fine)'] = { matches: fine, listeners: new Set() };
  media['(prefers-reduced-motion: reduce)'] = { matches: reduced, listeners: new Set() };
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

let frames: FrameRequestCallback[] = [];
const flush = () => {
  const run = frames;
  frames = [];
  run.forEach((cb) => cb(0));
};

function move(x: number, y: number, init: { pointerType?: string; target?: Element } = {}) {
  const event = new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  (init.target ?? document.body).dispatchEvent(event);
}

const overlay = () => document.querySelector<HTMLElement>('.arsenal-crosshair');

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames[id - 1] = () => undefined;
  });
  stubMatchMedia();
  delete document.documentElement.dataset.motion;
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('mountCrosshairCursor', () => {
  it('validates its options before touching the DOM', () => {
    expect(() => mountCrosshairCursor({ classPrefix: '1bad prefix' })).toThrow(TypeError);
    expect(() => mountCrosshairCursor({ zIndex: 1.5 })).toThrow(TypeError);
    expect(overlay()).toBeNull();
  });

  it('mounts a hidden aria-hidden overlay and follows a mouse on the next frame', () => {
    const stop = mountCrosshairCursor({ zIndex: 70 });
    const el = overlay()!;
    expect(el.hidden).toBe(true);
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.style.zIndex).toBe('70');

    move(12, 345);
    move(40, 50);
    expect(frames).toHaveLength(1); // rAF-throttled: one frame for two moves
    flush();
    expect(el.hidden).toBe(false);
    expect(el.style.getPropertyValue('--crosshair-x')).toBe('40px');
    expect(el.style.getPropertyValue('--crosshair-y')).toBe('50px');
    expect(el.querySelector('.arsenal-crosshair__label')!.textContent).toBe('X 0040 / Y 0050');
    stop();
  });

  it('uses a custom class prefix and label formatter', () => {
    const stop = mountCrosshairCursor({ classPrefix: 'grid', formatLabel: (x, y) => `${x},${y}` });
    move(3, 4);
    flush();
    expect(document.querySelector('.grid__label')!.textContent).toBe('3,4');
    stop();
  });

  it('ignores touch and pen pointers', () => {
    const stop = mountCrosshairCursor();
    move(5, 5, { pointerType: 'touch' });
    move(5, 5, { pointerType: 'pen' });
    expect(frames).toHaveLength(0);
    expect(overlay()!.hidden).toBe(true);
    stop();
  });

  it('stays off without a fine hovering pointer', () => {
    stubMatchMedia({ fine: false });
    const stop = mountCrosshairCursor();
    move(5, 5);
    expect(frames).toHaveLength(0);
    stop();
  });

  it('stays off under reduced motion and under <html data-motion=paused>', () => {
    stubMatchMedia({ reduced: true });
    let stop = mountCrosshairCursor();
    move(5, 5);
    expect(frames).toHaveLength(0);
    stop();

    stubMatchMedia();
    document.documentElement.dataset.motion = 'paused';
    stop = mountCrosshairCursor();
    move(5, 5);
    expect(frames).toHaveLength(0);
    stop();
  });

  it('hides over editable targets and when one takes focus', () => {
    const stop = mountCrosshairCursor();
    move(5, 5);
    flush();
    expect(overlay()!.hidden).toBe(false);

    const input = document.createElement('input');
    document.body.append(input);
    move(6, 6, { target: input });
    expect(overlay()!.hidden).toBe(true);

    move(7, 7);
    flush();
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(overlay()!.hidden).toBe(true);

    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    const inner = document.createElement('span');
    editor.append(inner);
    document.body.append(editor);
    move(8, 8, { target: inner });
    expect(overlay()!.hidden).toBe(true);
    stop();
  });

  it('hides when the window blurs, the pointer leaves or the reduced-motion setting turns on', () => {
    const stop = mountCrosshairCursor();
    const show = () => {
      move(5, 5);
      flush();
      expect(overlay()!.hidden).toBe(false);
    };
    show();
    window.dispatchEvent(new Event('blur'));
    expect(overlay()!.hidden).toBe(true);

    show();
    document.documentElement.dispatchEvent(new Event('pointerleave'));
    expect(overlay()!.hidden).toBe(true);

    show();
    media['(prefers-reduced-motion: reduce)'].matches = true;
    media['(prefers-reduced-motion: reduce)'].listeners.forEach((cb) => cb());
    expect(overlay()!.hidden).toBe(true);
    stop();
  });

  it('cleans up every listener and the overlay, and is idempotent', () => {
    const removeDoc = vi.spyOn(document, 'removeEventListener');
    const removeWin = vi.spyOn(window, 'removeEventListener');
    const stop = mountCrosshairCursor();
    stop();
    stop();
    expect(overlay()).toBeNull();
    const docEvents = removeDoc.mock.calls.map(([type]) => type);
    expect(docEvents).toEqual(
      expect.arrayContaining(['pointermove', 'focusin', 'visibilitychange']),
    );
    expect(removeWin.mock.calls.map(([type]) => type)).toContain('blur');
    expect(media['(hover: hover) and (pointer: fine)'].listeners.size).toBe(0);
    expect(media['(prefers-reduced-motion: reduce)'].listeners.size).toBe(0);
    move(5, 5);
    expect(frames).toHaveLength(0);
  });

  it('is a no-op on the server', async () => {
    vi.stubGlobal('window', undefined);
    const stop = mountCrosshairCursor();
    expect(typeof stop).toBe('function');
    vi.unstubAllGlobals();
  });
});
