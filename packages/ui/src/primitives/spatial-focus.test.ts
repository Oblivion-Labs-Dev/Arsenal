import { describe, expect, it } from 'vitest';
import {
  nextInDirection,
  pickInDirection,
  resolveSpatialMove,
  SPATIAL_DOM_MIN_FORWARD,
  spatialDirectionForKey,
  type SpatialDirection,
  type SpatialNode,
  type SpatialRect,
} from './spatial-focus';

const box = (x: number, y: number, width = 100, height = 60): SpatialRect => ({
  x,
  y,
  width,
  height,
});

// TVApplication c2-home/src/logic.ts `nextInDirection` (same owner), reformatted only. It is the
// reference the shared scorer must reproduce with { sideWeight: 2.7, minForward: 2 }.
type TvRect = { left: number; top: number; width: number; height: number };
function tvNextInDirection(rects: TvRect[], current: number, key: string): number {
  const r = rects[current];
  if (!r) return current;
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  let winner = current;
  let score = Infinity;
  rects.forEach((c, i) => {
    if (i === current) return;
    const dx = c.left + c.width / 2 - x;
    const dy = c.top + c.height / 2 - y;
    const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
    const forward =
      key === 'ArrowLeft' ? -dx : key === 'ArrowRight' ? dx : key === 'ArrowUp' ? -dy : dy;
    if (forward <= 2) return;
    const side = Math.abs(horizontal ? dy : dx);
    const value = forward + side * 2.7;
    if (value < score) {
      score = value;
      winner = i;
    }
  });
  return winner;
}

function lcg(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

describe('spatial scorer', () => {
  // 3×3 grid, indices row-major.
  const grid = Array.from({ length: 9 }, (_, i) => box((i % 3) * 120, Math.floor(i / 3) * 80));

  it('moves one cell in each direction and stays put at an edge', () => {
    expect(nextInDirection(grid, 4, 'left')).toBe(3);
    expect(nextInDirection(grid, 4, 'right')).toBe(5);
    expect(nextInDirection(grid, 4, 'up')).toBe(1);
    expect(nextInDirection(grid, 4, 'down')).toBe(7);
    expect(nextInDirection(grid, 0, 'left')).toBe(0);
    expect(nextInDirection(grid, 8, 'down')).toBe(8);
    expect(nextInDirection(grid, 42, 'down')).toBe(42);
  });

  it('prefers the aligned neighbour in an irregular layout', () => {
    // Two small tiles over one wide tile, plus an offset tile far to the right.
    const rects = [box(0, 0), box(120, 0), box(0, 80, 220), box(400, 30)];
    expect(nextInDirection(rects, 0, 'down')).toBe(2);
    expect(nextInDirection(rects, 1, 'down')).toBe(2);
    expect(nextInDirection(rects, 2, 'up')).toBe(0);
    expect(nextInDirection(rects, 1, 'right')).toBe(3);
  });

  it('skips empty, hidden and non-finite rects', () => {
    const rects = [box(0, 0), box(120, 0, 0, 0), box(240, 0), box(Number.NaN, 0)];
    expect(nextInDirection(rects, 0, 'right')).toBe(2);
    expect(pickInDirection(box(0, 0), [undefined, box(120, 0, 10, 0)], 'right')).toBe(-1);
  });

  it('reproduces the TV home scorer with its tuning on random layouts', () => {
    const keys: Record<SpatialDirection, string> = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
    };
    for (let seed = 1; seed <= 200; seed++) {
      const random = lcg(seed);
      const rects = Array.from({ length: 12 }, () =>
        box(random() * 1600, random() * 900, 40 + random() * 200, 40 + random() * 200),
      );
      const tv = rects.map((r) => ({ left: r.x, top: r.y, width: r.width, height: r.height }));
      for (let from = 0; from < rects.length; from++) {
        for (const direction of Object.keys(keys) as SpatialDirection[]) {
          expect(nextInDirection(rects, from, direction, { sideWeight: 2.7, minForward: 2 })).toBe(
            tvNextInDirection(tv, from, keys[direction]),
          );
        }
      }
    }
  });

  it('maps only arrow keys', () => {
    expect(spatialDirectionForKey('ArrowUp')).toBe('up');
    expect(spatialDirectionForKey('ArrowLeft')).toBe('left');
    expect(spatialDirectionForKey('Enter')).toBeNull();
    expect(spatialDirectionForKey('toString')).toBeNull();
  });
});

describe('resolveSpatialMove with regions', () => {
  // Sidebar region (x 0..100) with three items; content region holding two row regions.
  const nodes: SpatialNode[] = [
    { id: 'sidebar', rect: box(0, 0, 100, 300), parent: null, region: true },
    { id: 's1', rect: box(0, 0, 100, 40), parent: 'sidebar' },
    { id: 's2', rect: box(0, 100, 100, 40), parent: 'sidebar' },
    { id: 's3', rect: box(0, 200, 100, 40), parent: 'sidebar' },
    { id: 'content', rect: box(140, 0, 500, 300), parent: null, region: true },
    { id: 'row1', rect: box(140, 0, 500, 120), parent: 'content', region: true },
    { id: 'a1', rect: box(140, 0), parent: 'row1' },
    { id: 'a2', rect: box(260, 0), parent: 'row1' },
    { id: 'a3', rect: box(380, 0), parent: 'row1' },
    { id: 'row2', rect: box(140, 160, 500, 120), parent: 'content', region: true },
    { id: 'b1', rect: box(140, 180), parent: 'row2' },
    { id: 'b2', rect: box(380, 180), parent: 'row2' },
  ];

  it('moves within a region first', () => {
    expect(resolveSpatialMove(nodes, 'a1', 'right')).toBe('a2');
    expect(resolveSpatialMove(nodes, 's1', 'down')).toBe('s2');
  });

  it('crosses into a sibling region at its nearest item when nothing lies ahead locally', () => {
    expect(resolveSpatialMove(nodes, 'a3', 'down')).toBe('b2');
    expect(resolveSpatialMove(nodes, 'a1', 'down')).toBe('b1');
    expect(resolveSpatialMove(nodes, 'a1', 'left')).toBe('s1');
    expect(resolveSpatialMove(nodes, 'b1', 'left')).toBe('s3');
  });

  it('lands on the remembered item when re-entering a region, and ignores stale memory', () => {
    const memory = new Map([
      ['sidebar', 's2'],
      ['row2', 'gone'],
    ]);
    expect(resolveSpatialMove(nodes, 'a1', 'left', { memory })).toBe('s2');
    expect(resolveSpatialMove(nodes, 'a3', 'down', { memory })).toBe('b2');
    // Memory for the whole content region wins over the nearest item in it.
    expect(resolveSpatialMove(nodes, 's1', 'right', { memory: new Map([['content', 'b2']]) })).toBe(
      'b2',
    );
  });

  it('returns null at the outer edge and for unknown or region origins', () => {
    expect(resolveSpatialMove(nodes, 'a3', 'right')).toBeNull();
    expect(resolveSpatialMove(nodes, 's1', 'up')).toBeNull();
    expect(resolveSpatialMove(nodes, 'nope', 'up')).toBeNull();
    expect(resolveSpatialMove(nodes, 'row1', 'down')).toBeNull();
  });

  it('ignores sub-pixel centre noise from a scaled (focused) tile with the DOM tolerance', () => {
    // Real browser case: the focused tile is scaled 1.04 about its centre and the same-row
    // neighbour's measured centre ends up 0.0000057px lower, which strict scoring calls "down".
    const scaled: SpatialNode[] = [
      { id: 'top', rect: box(0, 0, 400, 100), parent: null, region: true },
      { id: 'tenet', rect: { x: 160, y: 26.0000057, width: 154, height: 56 }, parent: 'top' },
      { id: 'dune', rect: { x: 317, y: 24.88, width: 160.16, height: 58.24 }, parent: 'top' },
      { id: 'bottom', rect: box(0, 100, 400, 100), parent: null, region: true },
      { id: 'weather', rect: box(320, 126, 154, 56), parent: 'bottom' },
    ];
    expect(
      resolveSpatialMove(scaled, 'dune', 'down', { minForward: SPATIAL_DOM_MIN_FORWARD }),
    ).toBe('weather');
  });

  it('terminates on a malformed parent cycle and an empty region', () => {
    const broken: SpatialNode[] = [
      { id: 'r1', rect: box(0, 0, 300, 100), parent: 'r2', region: true },
      { id: 'r2', rect: box(0, 200, 300, 100), parent: 'r1', region: true },
      { id: 'x', rect: box(0, 0), parent: 'r1' },
    ];
    expect(resolveSpatialMove(broken, 'x', 'down')).toBeNull();
    const empty: SpatialNode[] = [
      { id: 'x', rect: box(0, 0), parent: null },
      { id: 'void', rect: box(0, 100), parent: null, region: true },
    ];
    expect(resolveSpatialMove(empty, 'x', 'down')).toBeNull();
  });
});
