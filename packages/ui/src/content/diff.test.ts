import { describe, expect, it } from 'vitest';
import { alignHunkLines, diffTotals, type DiffLine, type FileDiff } from './diff';

const ctx = (n: number): DiffLine => ({
  type: 'context',
  content: `c${n}`,
  oldLineNumber: n,
  newLineNumber: n,
});
const del = (n: number): DiffLine => ({ type: 'deletion', content: `d${n}`, oldLineNumber: n });
const add = (n: number): DiffLine => ({ type: 'addition', content: `a${n}`, newLineNumber: n });

describe('alignHunkLines', () => {
  it('puts context on both sides', () => {
    expect(alignHunkLines([ctx(1)])).toEqual([{ left: ctx(1), right: ctx(1) }]);
  });
  it('pairs deletions with additions in the same run and pads the shorter side', () => {
    expect(alignHunkLines([ctx(1), del(2), del(3), add(2), ctx(4)])).toEqual([
      { left: ctx(1), right: ctx(1) },
      { left: del(2), right: add(2) },
      { left: del(3), right: null },
      { left: ctx(4), right: ctx(4) },
    ]);
  });
  it('handles additions only', () => {
    expect(alignHunkLines([add(1), add(2)])).toEqual([
      { left: null, right: add(1) },
      { left: null, right: add(2) },
    ]);
  });
  it('returns nothing for an empty hunk', () => {
    expect(alignHunkLines([])).toEqual([]);
  });
});

describe('diffTotals', () => {
  it('sums across files', () => {
    const f = (a: number, d: number): FileDiff => ({
      file: `f${a}`,
      status: 'modified',
      additions: a,
      deletions: d,
      hunks: [],
    });
    expect(diffTotals([f(3, 1), f(2, 5)])).toEqual({ additions: 5, deletions: 6 });
    expect(diffTotals([])).toEqual({ additions: 0, deletions: 0 });
  });
});
