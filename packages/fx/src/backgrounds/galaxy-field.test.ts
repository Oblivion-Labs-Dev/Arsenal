import { describe, expect, it } from 'vitest';
import {
  createGalaxyFieldViewport,
  createGalaxyParticleField,
  stepGalaxyParticleField,
} from './galaxy-field';

describe('galaxy field', () => {
  it('is deterministic per seed', () => {
    const a = createGalaxyParticleField(800, 600, 300, 11);
    const b = createGalaxyParticleField(800, 600, 300, 11);
    const c = createGalaxyParticleField(800, 600, 300, 12);
    expect(b).toEqual(a);
    expect(c.particles).not.toEqual(a.particles);
    expect(a.particles).toHaveLength(300);
  });

  it('keeps particles finite and near the viewport while stepping', () => {
    const { particles, numArms } = createGalaxyParticleField(800, 600, 300, 3);
    const viewport = createGalaxyFieldViewport(800, 600);
    const rotation = { current: 0 };
    for (let f = 0; f < 240; f++) {
      const pointer = f % 2 ? { x: 400, y: 300 } : null;
      stepGalaxyParticleField(particles, numArms, pointer, 1, 16.67, f * 16.67, viewport, rotation);
    }
    expect(rotation.current).toBeGreaterThan(0);
    for (const p of particles) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(p.x).toBeGreaterThan(-800);
      expect(p.x).toBeLessThan(1600);
      expect(p.y).toBeGreaterThan(-600);
      expect(p.y).toBeLessThan(1200);
    }
  });

  it('does not rotate when motion is reduced', () => {
    const { particles, numArms } = createGalaxyParticleField(400, 400, 50, 1);
    const rotation = { current: 0 };
    const viewport = createGalaxyFieldViewport(400, 400);
    stepGalaxyParticleField(particles, numArms, null, 1, 16, 16, viewport, rotation, {
      reduceMotion: true,
    });
    expect(rotation.current).toBe(0);
  });
});
