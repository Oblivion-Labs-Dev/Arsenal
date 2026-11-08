import { describe, expect, it } from 'vitest';
import {
  distributionShares,
  donutArcs,
  lineGeometry,
  roundTo,
  semiGaugeGeometry,
  stackMax,
  stackTotal,
} from './chart-geometry';
import { drawdownChartGeometry } from './drawdown-chart';
import { treemapLabelLevel, treemapMoveFocus, treemapTileColor } from './treemap';

const frame = { cx: 32, cy: 30, radius: 24 };

describe('semiGaugeGeometry', () => {
  it('puts 0 on the left, 0.5 at the top and 1 on the right', () => {
    expect(semiGaugeGeometry(0, [], { ...frame, needleInset: 0 }).needle).toEqual({ x: 8, y: 30 });
    expect(semiGaugeGeometry(0.5, [], { ...frame, needleInset: 0 }).needle).toEqual({
      x: 32,
      y: 6,
    });
    expect(semiGaugeGeometry(1, [], { ...frame, needleInset: 0 }).needle).toEqual({ x: 56, y: 30 });
  });
  it('draws no needle for unknown values and clamps out-of-range ones', () => {
    expect(semiGaugeGeometry(null, [], frame).needle).toBeNull();
    expect(semiGaugeGeometry(Number.NaN, [], frame).share).toBeNull();
    expect(semiGaugeGeometry(4, [], frame).share).toBe(1);
  });
  it('makes one arc per band', () => {
    const geo = semiGaugeGeometry(
      0.3,
      [
        { from: 0, to: 0.5 },
        { from: 0.5, to: 1 },
      ],
      frame,
    );
    expect(geo.arcs).toHaveLength(2);
    expect(geo.arcs[0]).toBe('M 8 30 A 24 24 0 0 1 32 6');
  });
});

describe('donutArcs', () => {
  it('splits the circumference by share and chains offsets', () => {
    const arcs = donutArcs([1, 3], 100);
    expect(arcs).toEqual([
      { index: 0, length: 25, offset: -0, share: 0.25 },
      { index: 1, length: 75, offset: -25, share: 0.75 },
    ]);
  });
  it('skips unknown and non-positive values and returns nothing for an empty total', () => {
    expect(donutArcs([null, 2, -1, 0], 10).map((a) => a.index)).toEqual([1]);
    expect(donutArcs([null, 0], 10)).toEqual([]);
  });
});

describe('lineGeometry', () => {
  const plot = { left: 0, right: 100, top: 0, bottom: 100 };
  it('splits the path at gaps instead of inventing points', () => {
    const geo = lineGeometry([1, 2, null, 4], plot);
    expect(geo.segments).toHaveLength(2);
    expect(geo.points.map((p) => p.index)).toEqual([0, 1, 3]);
    expect(geo.max).toBe(4);
    expect(geo.points[2]).toMatchObject({ x: 100, y: 0 });
  });
  it('keeps a usable range when everything is zero or unknown', () => {
    expect(lineGeometry([0, 0], plot).max).toBe(1);
    expect(lineGeometry([null, null], plot).points).toEqual([]);
  });
});

describe('stacks and distributions', () => {
  const rows = [
    { a: 2, b: null },
    { a: 1, b: 4 },
  ];
  it('ignores unknown cells and hidden keys', () => {
    expect(stackTotal(rows[0]!, ['a', 'b'])).toBe(2);
    expect(stackMax(rows, ['a', 'b'])).toBe(5);
    expect(stackMax(rows, ['b'])).toBe(4);
    expect(stackMax([], ['a'])).toBe(1);
  });
  it('gives shares of the known total and zero shares for an empty total', () => {
    expect(distributionShares([1, null, 3]).shares.map((s) => s.share)).toEqual([0.25, 0, 0.75]);
    expect(distributionShares([null, 0]).total).toBe(0);
  });
  it('rounds to fixed places', () => {
    expect(roundTo(1.256, 2)).toBe(1.26);
    expect(roundTo(1.6, -1)).toBe(2);
  });
});

describe('treemap helpers', () => {
  it('colours by sign and intensity, and leaves unknown uncoloured', () => {
    expect(treemapTileColor(0.03)).toBe(
      'color-mix(in srgb, var(--arsenal-success) 55%, var(--arsenal-surface))',
    );
    expect(treemapTileColor(-0.015)).toContain('var(--arsenal-danger) 28%');
    expect(treemapTileColor(null)).toBeNull();
    expect(treemapTileColor(Number.NaN)).toBeNull();
  });
  it('only labels tiles with room', () => {
    expect(treemapLabelLevel(20, 30)).toBe('detail');
    expect(treemapLabelLevel(8, 12)).toBe('name');
    expect(treemapLabelLevel(5, 50)).toBe('none');
  });
  it('moves focus spatially and stays put at an edge', () => {
    const rects = [
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 50, y: 0, width: 50, height: 50 },
      { x: 0, y: 50, width: 100, height: 50 },
    ];
    expect(treemapMoveFocus(rects, 0, 'right')).toBe(1);
    expect(treemapMoveFocus(rects, 1, 'down')).toBe(2);
    expect(treemapMoveFocus(rects, 0, 'left')).toBe(0);
    expect(treemapMoveFocus(rects, 9, 'left')).toBe(9);
  });
});

describe('drawdownChartGeometry', () => {
  it('returns null without enough history', () => {
    expect(drawdownChartGeometry([{ date: '2026-01-01', equity: 1 }])).toBeNull();
  });
  it('marks the trough and the recovery', () => {
    const geo = drawdownChartGeometry([
      { date: 'd1', equity: 100 },
      { date: 'd2', equity: 80 },
      { date: 'd3', equity: 110 },
    ]);
    expect(geo?.summary.worst.date).toBe('d2');
    expect(geo?.worst.y).toBe(226);
    expect(geo?.recoveryX).toBe(966);
  });
  it('has no recovery line while still under water', () => {
    const geo = drawdownChartGeometry([
      { date: 'd1', equity: 100 },
      { date: 'd2', equity: 80 },
    ]);
    expect(geo?.recoveryX).toBeNull();
    expect(geo?.summary.recoveryDate).toBeNull();
  });
});
