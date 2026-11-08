import { describe, expect, it } from 'vitest';
import { createRng, gaussian, pick } from './random';

describe('random', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = Array.from({ length: 200 }, a);
    expect(Array.from({ length: 200 }, b)).toEqual(seqA);
    expect(Array.from({ length: 200 }, c)).not.toEqual(seqA);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('gaussian is roughly standard normal', () => {
    const rng = createRng(7);
    const xs = Array.from({ length: 4000 }, () => gaussian(rng));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.08);
    expect(Math.abs(variance - 1)).toBeLessThan(0.1);
  });

  it('pick returns a list item and throws on an empty list', () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) expect(['a', 'b', 'c']).toContain(pick(rng, ['a', 'b', 'c']));
    expect(() => pick(rng, [])).toThrow();
  });
});
