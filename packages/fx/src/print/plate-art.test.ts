import { describe, expect, it } from 'vitest';
import { edgeAlpha, halftone, luminance, sobel, warmth } from './plate-art';

const px = (...rgb: [number, number, number][]) => rgb.flatMap(([r, g, b]) => [r, g, b, 255]);

describe('luminance', () => {
  it('maps black to 0, white to 1 and weights green most (Rec.709)', () => {
    const out = luminance(px([0, 0, 0], [255, 255, 255], [0, 255, 0], [0, 0, 255]), 4, 1);
    expect(out[0]).toBe(0);
    expect(out[1]).toBeCloseTo(1, 5);
    expect(out[2]).toBeCloseTo(0.7152, 4);
    expect(out[3]).toBeCloseTo(0.0722, 4);
  });

  it('rejects a buffer smaller than width x height', () => {
    expect(() => luminance(px([0, 0, 0]), 2, 1)).toThrow(RangeError);
  });

  it('rejects non-positive or fractional dimensions', () => {
    expect(() => luminance([], 0, 1)).toThrow(/positive integers/);
    expect(() => luminance(px([0, 0, 0]), 0.5, 2)).toThrow(RangeError);
  });
});

describe('warmth', () => {
  it('is 0 for cool or neutral pixels and saturates at 1 for strong reds', () => {
    const out = warmth(px([128, 128, 128], [0, 0, 255], [255, 0, 0], [140, 0, 40]), 4, 1);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0);
    expect(out[2]).toBe(1);
    expect(out[3]).toBeCloseTo((140 - 40 - 40) / 120, 5);
  });

  it('validates its input', () => {
    expect(() => warmth([1, 2, 3], 1, 1)).toThrow(RangeError);
  });
});

describe('sobel', () => {
  it('finds a vertical edge, leaves flat areas and borders at 0 and normalises the max to 1', () => {
    // 5x3 field: left half dark, right half bright.
    const w = 5;
    const h = 3;
    const gray = Array.from({ length: w * h }, (_, i) => (i % w >= 3 ? 1 : 0));
    const out = sobel(gray, w, h);
    expect(Math.max(...out)).toBe(1);
    for (let x = 0; x < w; x += 1) {
      expect(out[x]).toBe(0);
      expect(out[(h - 1) * w + x]).toBe(0);
    }
    expect(out[1 * w + 1]).toBe(0);
    expect(out[1 * w + 2]).toBeGreaterThan(0);
  });

  it('returns all zeros (not NaN) for a flat field', () => {
    const out = sobel(new Array(9).fill(0.5), 3, 3);
    expect([...out].every((v) => v === 0)).toBe(true);
  });

  it('rejects a short field', () => {
    expect(() => sobel([0, 0], 2, 2)).toThrow(RangeError);
  });
});

describe('halftone', () => {
  it('skips near-white tone and grows dot area with tone', () => {
    expect(halftone(40, 40, 8, 45, () => 0)).toEqual([]);
    const light = halftone(40, 40, 8, 45, () => 0.25);
    const dark = halftone(40, 40, 8, 45, () => 1);
    expect(light.length).toBeGreaterThan(0);
    expect(light.length).toBe(dark.length);
    expect(dark[0].r).toBeCloseTo(8 * 0.62, 5);
    expect(light[0].r).toBeCloseTo(8 * 0.62 * 0.5, 5);
  });

  it('only places dots within one cell of the output', () => {
    for (const dot of halftone(60, 30, 6, 15, () => 0.5)) {
      expect(dot.x).toBeGreaterThanOrEqual(-6);
      expect(dot.y).toBeGreaterThanOrEqual(-6);
      expect(dot.x).toBeLessThanOrEqual(66);
      expect(dot.y).toBeLessThanOrEqual(36);
    }
  });

  it('clamps sample coordinates into the image', () => {
    let outside = 0;
    halftone(30, 30, 5, 30, (x, y) => {
      if (x < 0 || y < 0 || x > 29 || y > 29) outside += 1;
      return 0.5;
    });
    expect(outside).toBe(0);
  });

  it('rejects a cell size that would never advance the screen', () => {
    expect(() => halftone(10, 10, 0, 45, () => 1)).toThrow(RangeError);
    expect(() => halftone(10, 10, -2, 45, () => 1)).toThrow(RangeError);
    expect(() => halftone(10, 10, Number.NaN, 45, () => 1)).toThrow(RangeError);
    expect(() => halftone(0, 10, 4, 45, () => 1)).toThrow(RangeError);
  });
});

describe('edgeAlpha', () => {
  it('drops noise below the threshold and saturates strong edges', () => {
    expect(edgeAlpha(0.05)).toBe(0);
    expect(edgeAlpha(0.07)).toBe(0);
    expect(edgeAlpha(0.3)).toBeGreaterThan(0);
    expect(edgeAlpha(0.3)).toBeLessThan(1);
    expect(edgeAlpha(1)).toBe(1);
  });
});
