import { describe, it, expect } from 'vitest';
import { levenshteinDistance, stringSimilarity } from './fuzzy.js';

describe('fuzzy', () => {
  it('computes edit distance', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('sitting', 'kitten')).toBe(3);
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('same', 'same')).toBe(0);
    expect(levenshteinDistance('flaw', 'lawn')).toBe(2);
  });
  it('scores similarity in [0, 1]', () => {
    expect(stringSimilarity('', '')).toBe(1);
    expect(stringSimilarity('abc', 'abc')).toBe(1);
    expect(stringSimilarity('abc', 'xyz')).toBe(0);
    expect(stringSimilarity('kitten', 'sitting')).toBeCloseTo(1 - 3 / 7);
  });
});
