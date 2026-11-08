import { describe, expect, it } from 'vitest';
import { createBurst, stepSparks } from './particle-burst';

describe('particle burst', () => {
  it('is deterministic and honours options', () => {
    const a = createBurst(50, 60, { count: 30, colorCount: 3 }, 7);
    expect(createBurst(50, 60, { count: 30, colorCount: 3 }, 7)).toEqual(a);
    expect(a).toHaveLength(30);
    for (const s of a) {
      expect(s.x).toBe(50);
      expect(s.y).toBe(60);
      expect(s.colorIndex).toBeGreaterThanOrEqual(0);
      expect(s.colorIndex).toBeLessThan(3);
      const speed = Math.hypot(s.vx, s.vy + 3);
      expect(speed).toBeGreaterThanOrEqual(3 - 1e-9);
      expect(speed).toBeLessThanOrEqual(10 + 1e-9);
    }
    expect(createBurst(0, 0)).toHaveLength(45);
  });

  it('keeps sparks inside the box and removes them once faded', () => {
    const sparks = createBurst(100, 100, { count: 40, maxSpeed: 30 }, 1);
    let alive = sparks.length;
    for (let f = 0; f < 200 && alive > 0; f++) {
      alive = stepSparks(sparks, 200, 200, 1);
      for (const s of sparks) {
        expect(s.x).toBeGreaterThanOrEqual(s.size - 1e-9);
        expect(s.x).toBeLessThanOrEqual(200 - s.size + 1e-9);
        expect(s.y).toBeGreaterThanOrEqual(s.size - 1e-9);
        expect(s.y).toBeLessThanOrEqual(200 - s.size + 1e-9);
        expect(s.alpha).toBeGreaterThan(0);
      }
    }
    expect(alive).toBe(0);
    expect(sparks).toHaveLength(0);
  });
});
