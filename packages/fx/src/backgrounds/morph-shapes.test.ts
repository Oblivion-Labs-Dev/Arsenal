import { describe, expect, it } from 'vitest';
import {
  createMorphPoints,
  MORPH_SHAPES,
  morphShapeTargets,
  projectPoint,
  stepMorphPoints,
} from './morph-shapes';

describe('morph shapes', () => {
  it('every shape returns `count` finite, bounded points', () => {
    for (const shape of MORPH_SHAPES) {
      const pts = morphShapeTargets(shape, 300, 1);
      expect(pts, shape).toHaveLength(300);
      for (const p of pts) {
        const finite = Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
        expect(finite, shape).toBe(true);
        expect(Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)), shape).toBeLessThan(400);
      }
    }
  });

  it('puts sphere points on radius 140', () => {
    for (const p of morphShapeTargets('sphere', 200)) {
      expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(140, 6);
    }
  });

  it('is deterministic per seed', () => {
    for (const shape of MORPH_SHAPES) {
      expect(morphShapeTargets(shape, 120, 9)).toEqual(morphShapeTargets(shape, 120, 9));
    }
    expect(createMorphPoints(50, 4, 3)).toEqual(createMorphPoints(50, 4, 3));
  });

  it('points converge on their targets', () => {
    const points = createMorphPoints(100, 3, 2);
    const targets = morphShapeTargets('cube', 100, 2);
    for (let f = 0; f < 400; f++) stepMorphPoints(points, targets, 1, 1);
    for (const p of points) {
      const t = targets[p.id];
      if (!t) throw new Error('missing target');
      expect(Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z)).toBeLessThan(0.01);
    }
    expect(new Set(points.map((p) => p.colorIndex))).toEqual(new Set([0, 1, 2]));
  });

  it('projects with rotation and perspective', () => {
    expect(projectPoint({ x: 10, y: 20, z: 0 }, 0, 0, 100, 100)).toEqual({
      sx: 110,
      sy: 120,
      depth: 0,
      scale: 1,
    });
    const turned = projectPoint({ x: 10, y: 0, z: 0 }, 0, Math.PI / 2, 0, 0);
    expect(turned.sx).toBeCloseTo(0, 8);
    expect(turned.depth).toBeCloseTo(10, 8);
    expect(turned.scale).toBeCloseTo(400 / 410, 8);
  });
});
