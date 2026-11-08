import { describe, expect, it } from 'vitest';
import {
  cosmicCountsForViewport,
  cosmicParticleAlpha,
  createCosmicParticleField,
  stepCosmicParticleField,
} from './cosmic-field';

describe('cosmic field', () => {
  it('clamps layer counts for tiny and huge viewports', () => {
    expect(cosmicCountsForViewport(10, 10)).toEqual({ micro: 96, mid: 38, hero: 8, dust: 26 });
    expect(cosmicCountsForViewport(10000, 10000)).toEqual({
      micro: 300,
      mid: 130,
      hero: 32,
      dust: 88,
    });
  });

  it('is deterministic per seed and sized by the counts', () => {
    const a = createCosmicParticleField(1280, 720, 4);
    expect(createCosmicParticleField(1280, 720, 4)).toEqual(a);
    expect(createCosmicParticleField(1280, 720, 5)).not.toEqual(a);
    const c = cosmicCountsForViewport(1280, 720);
    expect(a).toHaveLength(c.micro + c.mid + c.hero + c.dust);
  });

  it('stays finite while stepping, and twinkle stays within the base alpha', () => {
    const particles = createCosmicParticleField(1280, 720, 8);
    for (let f = 0; f < 200; f++) {
      stepCosmicParticleField(particles, {
        width: 1280,
        height: 720,
        dt: 1,
        time: f * 16.67,
        pointer: { x: 640, y: 360 },
        scrollY: f,
      });
    }
    for (const p of particles) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      for (const t of [0, 5000, 20000]) {
        const a = cosmicParticleAlpha(p, t);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(p.alpha + 1e-9);
      }
    }
  });
});
