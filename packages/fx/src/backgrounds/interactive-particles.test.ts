import { describe, expect, it } from 'vitest';
import {
  createMeshParticles,
  meshAttraction,
  meshLinkAlpha,
  meshLinkReach,
  meshParticleCount,
  MESH_WRAP_PADDING,
  stepMeshParticles,
  wrapMeshY,
} from './interactive-particles';
import { createRng } from './random';

describe('interactive particles', () => {
  it('clamps particle counts per intensity', () => {
    expect(meshParticleCount(10, 10, 'normal')).toBe(60);
    expect(meshParticleCount(10000, 10000, 'normal')).toBe(420);
    expect(meshParticleCount(10, 10, 'intense')).toBe(120);
    expect(meshParticleCount(10000, 10000, 'intense')).toBe(900);
  });

  it('is deterministic per seed', () => {
    const a = createMeshParticles(1280, 720, 'normal', 3);
    expect(createMeshParticles(1280, 720, 'normal', 3)).toEqual(a);
    expect(createMeshParticles(1280, 720, 'normal', 4)).not.toEqual(a);
  });

  it('ramps attraction over 1.5 s and caps it', () => {
    expect(meshAttraction(0)).toBe(0);
    expect(meshAttraction(750)).toBeCloseTo(0.5 ** 4 * 0.22, 10);
    expect(meshAttraction(1500)).toBeCloseTo(0.22, 10);
    expect(meshAttraction(99999)).toBeCloseTo(0.22, 10);
  });

  it('wraps y inside the padded band', () => {
    expect(wrapMeshY(-MESH_WRAP_PADDING - 1, 500)).toBeGreaterThan(400);
    expect(wrapMeshY(500 + MESH_WRAP_PADDING + 1, 500)).toBeLessThan(0);
    expect(wrapMeshY(200, 500)).toBe(200);
  });

  it('fades links to zero at the reach edge', () => {
    const reach = meshLinkReach(1, 1, 'normal');
    expect(reach).toBeGreaterThan(0);
    expect(meshLinkAlpha(reach + 1, reach, 1, 'normal', 0)).toBeLessThanOrEqual(0);
    expect(meshLinkAlpha(0, reach, 1, 'normal', 0)).toBeGreaterThan(0);
  });

  it('stays finite and within the padded frame while stepping', () => {
    const list = createMeshParticles(800, 600, 'normal', 1);
    const rng = createRng(2);
    for (let f = 0; f < 300; f++) {
      stepMeshParticles(list, {
        width: 800,
        height: 600,
        dt: 1,
        frame: f,
        rng,
        pointer: { x: 400, y: 300, holdMs: f > 100 ? (f - 100) * 16 : null },
      });
    }
    for (const p of list) {
      expect(Number.isFinite(p.drawX) && Number.isFinite(p.drawY)).toBe(true);
      expect(p.y).toBeGreaterThanOrEqual(-MESH_WRAP_PADDING - 50);
      expect(p.y).toBeLessThanOrEqual(600 + MESH_WRAP_PADDING + 50);
    }
  });
});
