import { describe, expect, it } from 'vitest';
import { scrollbarCompensation, trapFocusTarget } from './panel';
import { assetIconSrc } from './asset-icon';

describe('scrollbarCompensation', () => {
  it('measures the scrollbar minus borders', () => {
    expect(scrollbarCompensation(1000, 983, 1, 1)).toBe(15);
    expect(scrollbarCompensation(1000, 1000, 0, 0)).toBe(0);
    expect(scrollbarCompensation(1000, 990, Number.NaN, 20)).toBe(0);
  });
});

describe('trapFocusTarget', () => {
  const box = 'box';
  const els = ['a', 'b', 'c'];
  it('wraps forward from the last element', () => {
    expect(trapFocusTarget(els, 'c', false, box)).toBe('a');
  });
  it('wraps backward from the first element or the container', () => {
    expect(trapFocusTarget(els, 'a', true, box)).toBe('c');
    expect(trapFocusTarget(els, box, true, box)).toBe('c');
  });
  it('lets the browser move focus in the middle', () => {
    expect(trapFocusTarget(els, 'b', false, box)).toBeNull();
  });
  it('blocks when nothing is focusable', () => {
    expect(trapFocusTarget([], box, false, box)).toBe('block');
  });
});

describe('assetIconSrc', () => {
  it('joins folder, name and extension', () => {
    expect(assetIconSrc('/icons/', 'trend-up')).toBe('/icons/trend-up.webp');
    expect(assetIconSrc('/icons', 'a b', '.png')).toBe('/icons/a%20b.png');
  });
  it('rejects an empty name', () => {
    expect(() => assetIconSrc('/icons', '')).toThrow();
  });
});
