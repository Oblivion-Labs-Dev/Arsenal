import { describe, expect, it } from 'vitest';
import {
  buildInfinityPathD,
  infinityNorm,
  infinityNormNormal,
  infinityNormTangent,
  infinityToPixel,
} from './infinity-curve';

describe('infinity curve', () => {
  it('follows x = sin t, y = sin 2t / 2', () => {
    expect(infinityNorm(0)).toEqual({ x: 0, y: 0 });
    const q = infinityNorm(Math.PI / 4);
    expect(q.x).toBeCloseTo(Math.SQRT1_2, 10);
    expect(q.y).toBeCloseTo(0.5, 10);
    expect(infinityNorm(Math.PI / 2).x).toBeCloseTo(1, 10);
  });

  it('has unit tangents with perpendicular normals', () => {
    for (let t = 0; t < Math.PI * 2; t += 0.37) {
      const tan = infinityNormTangent(t);
      const n = infinityNormNormal(t);
      expect(Math.hypot(tan.x, tan.y)).toBeCloseTo(1, 6);
      expect(tan.x * n.x + tan.y * n.y).toBeCloseTo(0, 10);
    }
  });

  it('maps to pixels with y pointing down', () => {
    const p = infinityToPixel(Math.PI / 4, 100, 50, 40);
    expect(p.x).toBeCloseTo(100 + Math.SQRT1_2 * 40, 8);
    expect(p.y).toBeCloseTo(50 - 0.5 * 40, 8);
  });

  it('builds a closed path with segments + 1 points', () => {
    const d = buildInfinityPathD(100, 50, 40, 8);
    expect(d.startsWith('M 100.000 50.000')).toBe(true);
    expect(d.match(/ L /g)).toHaveLength(8);
    expect(d.endsWith('L 100.000 50.000')).toBe(true);
  });
});
