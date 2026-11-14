// @vitest-environment jsdom
import { act, createElement, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PathPackets, packetTimings } from './path-packets';
import { pauseSvgOffscreen, usePauseSvgOffscreen } from './use-pause-svg-offscreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('packetTimings', () => {
  it('splits one loop evenly across legs', () => {
    expect(packetTimings(2)).toEqual([
      { start: 0, end: 0.5 },
      { start: 0.5, end: 1 },
    ]);
    expect(packetTimings(0)).toEqual([]);
    expect(() => packetTimings(-1)).toThrow(RangeError);
    expect(() => packetTimings(1.5)).toThrow(RangeError);
  });
});

describe('PathPackets', () => {
  const render = (props: Parameters<typeof PathPackets>[0]) =>
    renderToStaticMarkup(createElement('svg', null, createElement(PathPackets, props)));

  it('renders one hidden packet per leg with the original SMIL timing', () => {
    const html = render({ paths: ['M0 0 H10', 'M10 0 V10', 'M10 10 H0'] });
    expect(html.match(/<circle/g)).toHaveLength(3);
    expect(html).toContain('dur="2.55s"');
    expect(html).toContain('begin="1.4s"');
    expect(html).toContain('keyTimes="0;0.3333;0.6667;1"');
    expect(html).toContain('keyTimes="0;0.3333;0.3373;0.6627;0.6667;1"');
    expect(html).toContain('path="M10 0 V10"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('renders nothing without paths and rejects bad timing', () => {
    expect(render({ paths: [] })).toBe('<svg></svg>');
    expect(() => render({ paths: ['M0 0'], legSeconds: 0 })).toThrow(RangeError);
    expect(() => render({ paths: ['M0 0'], beginSeconds: -1 })).toThrow(RangeError);
  });
});

describe('pauseSvgOffscreen / usePauseSvgOffscreen', () => {
  let callback: IntersectionObserverCallback = () => undefined;
  const disconnect = vi.fn();
  let hidden = false;

  function fakeSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    svg.pauseAnimations = vi.fn();
    svg.unpauseAnimations = vi.fn();
    return svg;
  }
  const report = (isIntersecting: boolean) =>
    callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);

  beforeEach(() => {
    disconnect.mockReset();
    hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('pauses off screen and while the tab is hidden, resumes when back', () => {
    const svg = fakeSvg();
    const stop = pauseSvgOffscreen(svg);
    report(true);
    expect(svg.unpauseAnimations).toHaveBeenCalledTimes(1);
    report(false);
    expect(svg.pauseAnimations).toHaveBeenCalledTimes(1);
    report(true);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(svg.pauseAnimations).toHaveBeenCalledTimes(2);
    stop();
    expect(disconnect).toHaveBeenCalled();
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(svg.unpauseAnimations).toHaveBeenCalledTimes(2);
  });

  it('is a no-op without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const svg = fakeSvg();
    expect(() => pauseSvgOffscreen(svg)()).not.toThrow();
    expect(svg.pauseAnimations).not.toHaveBeenCalled();
  });

  it('the hook observes only when enabled and disconnects on unmount', () => {
    const svg = fakeSvg();
    const host = document.createElement('div');
    const root: Root = createRoot(host);
    function Probe({ enabled }: { enabled: boolean }) {
      const ref = useRef<SVGSVGElement | null>(svg);
      usePauseSvgOffscreen(ref, enabled);
      return null;
    }
    callback = () => undefined;
    act(() => root.render(createElement(Probe, { enabled: false })));
    report(false);
    expect(svg.pauseAnimations).not.toHaveBeenCalled();
    act(() => root.render(createElement(Probe, { enabled: true })));
    report(false);
    expect(svg.pauseAnimations).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    expect(disconnect).toHaveBeenCalled();
  });
});
