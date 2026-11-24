import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MagneticLink, magneticOffset } from './magnetic-link';

const rect = { left: 100, top: 100, width: 200, height: 50 };

describe('magneticOffset', () => {
  it('is neutral at the centre', () => {
    expect(magneticOffset(200, 125, rect, 0.1)).toEqual({ x: 0, y: 0, px: 50, py: 50 });
  });

  it('leans toward the pointer and reports its position in percent', () => {
    expect(magneticOffset(300, 100, rect, 0.1)).toEqual({ x: 10, y: -2.5, px: 100, py: 0 });
  });

  it('clamps the percent position but keeps leaning for pointers outside the box', () => {
    const o = magneticOffset(500, 400, rect, 0.1);
    expect(o.px).toBe(100);
    expect(o.py).toBe(100);
    expect(o.x).toBe(30);
  });

  it('returns the resting state for bad input or an empty box', () => {
    const resting = { x: 0, y: 0, px: 50, py: 50 };
    expect(magneticOffset(Number.NaN, 0, rect, 0.1)).toEqual(resting);
    expect(magneticOffset(10, 10, rect, Number.POSITIVE_INFINITY)).toEqual(resting);
    const empty = magneticOffset(5, 5, { left: 0, top: 0, width: 0, height: 0 }, 0.1);
    expect(Number.isFinite(empty.x) && Number.isFinite(empty.px)).toBe(true);
  });
});

describe('MagneticLink', () => {
  it('renders a real anchor with its href, children and a decorative sheen', () => {
    const html = renderToStaticMarkup(createElement(MagneticLink, { href: '/work' }, 'See work'));
    expect(html).toMatch(/^<a /);
    expect(html).toContain('href="/work"');
    expect(html).toContain('See work');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('data-hover');
  });

  it('omits the sheen when asked', () => {
    const html = renderToStaticMarkup(
      createElement(MagneticLink, { href: '#', sheen: false }, 'Plain'),
    );
    expect(html).not.toContain('radial-gradient');
  });
});
