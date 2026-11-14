// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EngravingHero, readEngravingInk } from './EngravingHero';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A 2D context that records fill colours; jsdom has no canvas of its own. */
function fakeContext() {
  const fills: string[] = [];
  const noop = () => undefined;
  const context = {
    fills,
    set fillStyle(value: string) {
      fills.push(value);
    },
    get fillStyle() {
      return fills[fills.length - 1] ?? '';
    },
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
  } as Record<string, unknown>;
  for (const name of [
    'setTransform',
    'fillRect',
    'save',
    'restore',
    'beginPath',
    'rect',
    'clip',
    'drawImage',
    'moveTo',
    'lineTo',
    'closePath',
    'fill',
    'stroke',
    'arc',
    'quadraticCurveTo',
    'bezierCurveTo',
    'ellipse',
    'translate',
    'rotate',
    'scale',
    'strokeRect',
  ])
    context[name] = vi.fn(noop);
  return context as unknown as CanvasRenderingContext2D & { fills: string[] };
}

let host: HTMLDivElement;
let root: Root;
let context: ReturnType<typeof fakeContext>;

beforeEach(() => {
  context = fakeContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => context as never,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 280,
    height: 200,
    left: 0,
    top: 0,
    right: 280,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('EngravingHero', () => {
  it('server-renders an accessible, not-yet-ready canvas', () => {
    const html = renderToStaticMarkup(createElement(EngravingHero, { label: 'A lighthouse' }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="A lighthouse"');
    expect(html).not.toContain('data-ready');
  });

  it('prints the finished plate at once under reduced motion, with explicit ink', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const onReady = vi.fn();
    act(() => {
      root.render(
        createElement(EngravingHero, {
          reducedMotion: true,
          ink: { ink: '#111111', paper: '#eeeeee', spot: '#cc0000' },
          onReady,
        }),
      );
    });
    const canvas = host.querySelector('canvas')!;
    expect(canvas.dataset.ready).toBe('true');
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(raf).not.toHaveBeenCalled();
    expect(context.fills).toContain('#eeeeee');
    expect(context.fills).toContain('#cc0000');
    expect(canvas.width).toBeGreaterThan(0);
  });

  it('ignores touch pointers and stops listening once unmounted', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const removed = vi.spyOn(window, 'removeEventListener');
    act(() => root.render(createElement(EngravingHero, {})));
    const calls = raf.mock.calls.length;
    window.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType: 'touch' }));
    expect(raf.mock.calls.length).toBe(calls);
    act(() => root.unmount());
    expect(removed).toHaveBeenCalledWith('pointermove', expect.any(Function));
    root = createRoot(host);
  });

  it('reads colours from custom properties, with overrides winning', () => {
    const element = document.createElement('div');
    element.style.setProperty('--brand-ink', 'rgb(1, 2, 3)');
    document.body.append(element);
    const ink = readEngravingInk(
      element,
      { ink: '--brand-ink', paper: '--missing', spot: '--missing' },
      { spot: 'red' },
    );
    expect(ink).toEqual({ ink: 'rgb(1, 2, 3)', paper: '#f4efe6', spot: 'red' });
    element.remove();
  });
});
