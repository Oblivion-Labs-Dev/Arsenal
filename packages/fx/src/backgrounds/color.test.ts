import { describe, expect, it } from 'vitest';
import { mixRgb, parseColor, relativeLuminance, rgba, schemeForBackground, toRgb } from './color';

describe('color', () => {
  it('parses hex, short hex and rgb()', () => {
    expect(parseColor('#ff8000')).toEqual([255, 128, 0]);
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30]);
    expect(parseColor('not a colour')).toBeNull();
  });

  it('falls back when input cannot be parsed', () => {
    expect(toRgb('nope', [1, 2, 3])).toEqual([1, 2, 3]);
    expect(toRgb([9, 9, 9], [1, 2, 3])).toEqual([9, 9, 9]);
  });

  it('mixes and formats', () => {
    expect(mixRgb([0, 0, 0], [200, 100, 50], 0.5)).toEqual([100, 50, 25]);
    expect(rgba([1, 2, 3], 0.5)).toMatch(/^rgba\(1, ?2, ?3, ?0\.5\)$/);
  });

  it('picks the scheme from background luminance', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(schemeForBackground([250, 248, 240])).toBe('light');
    expect(schemeForBackground([8, 10, 20])).toBe('dark');
  });
});
