import { describe, expect, it } from 'vitest';
import {
  createInfinityFieldViewport,
  createInfinityParticleField,
  remapInfinityParticleField,
  stepInfinityParticleField,
} from './infinity-field';

describe('infinity field', () => {
  it('is deterministic per seed', () => {
    const a = createInfinityParticleField(900, 500, 200, 5);
    expect(createInfinityParticleField(900, 500, 200, 5)).toEqual(a);
    expect(createInfinityParticleField(900, 500, 200, 6)).not.toEqual(a);
    expect(a).toHaveLength(200);
  });

  it('stays finite and bounded while stepping with a pointer', () => {
    const particles = createInfinityParticleField(900, 500, 200, 9);
    const viewport = createInfinityFieldViewport(900, 500);
    for (let f = 0; f < 240; f++) {
      stepInfinityParticleField(particles, { x: 450, y: 250 }, 1, 16.67, f * 16.67, viewport);
    }
    for (const p of particles) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(p.curveT).toBeGreaterThanOrEqual(0);
      expect(p.curveT).toBeLessThan(Math.PI * 2 + 1e-9);
      expect(Math.abs(p.x - 450)).toBeLessThan(900);
      expect(Math.abs(p.y - 250)).toBeLessThan(500);
    }
  });

  it('remaps particles proportionally on resize', () => {
    const particles = createInfinityParticleField(400, 400, 20, 2);
    const before = createInfinityFieldViewport(400, 400);
    const after = createInfinityFieldViewport(800, 800);
    const first = particles[0];
    if (!first) throw new Error('no particles');
    const u = (first.x - before.cx) / before.scale;
    remapInfinityParticleField(particles, before, after);
    expect((first.x - after.cx) / after.scale).toBeCloseTo(u, 8);
  });
});
