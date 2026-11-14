import { describe, expect, it } from 'vitest';
import {
  RESTING_BEAM,
  aimBeam,
  beamCone,
  beamLight,
  createScene,
  engrave,
  fbm,
  toneAt,
} from './engraving';

const scene = createScene(1.4);

describe('broadsheet engraving', () => {
  it('keeps noise in range and deterministic', () => {
    for (let i = 0; i < 50; i += 1) {
      const value = fbm(i * 0.37, i * 0.91);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(fbm(i * 0.37, i * 0.91)).toBe(value);
    }
  });

  it('prints the lantern glass as near paper and the tower cap as near solid', () => {
    const { lantern } = scene;
    expect(toneAt(scene, lantern.x, lantern.y)).toBeLessThan(0.1);
    expect(toneAt(scene, lantern.x, lantern.y - 0.03)).toBeGreaterThan(0.85);
  });

  it('lifts the ink where the beam falls', () => {
    const point = { x: 0.3, y: 0.3 };
    expect(toneAt(scene, point.x, point.y, 1)).toBeLessThan(toneAt(scene, point.x, point.y, 0));
  });

  it('aims the beam at the pointer but never into the rock behind the tower', () => {
    const seaward = aimBeam(scene, { x: 0.2, y: scene.lantern.y + 0.1 });
    expect(seaward.angle).toBeCloseTo(
      Math.atan2(0.1, 0.2 - scene.lantern.x) +
        (Math.atan2(0.1, 0.2 - scene.lantern.x) < 0 ? Math.PI * 2 : 0),
      6,
    );
    const landward = aimBeam(scene, { x: scene.aspect, y: scene.lantern.y });
    expect(landward.angle).toBeGreaterThanOrEqual(Math.PI * 0.86);
    expect(landward.angle).toBeLessThanOrEqual(Math.PI * 1.32);
  });

  it("lights the beam's axis and not the far side of the tower", () => {
    const { lantern } = scene;
    const along = {
      x: lantern.x + Math.cos(RESTING_BEAM.angle) * 0.4,
      y: lantern.y + Math.sin(RESTING_BEAM.angle) * 0.4,
    };
    expect(beamLight(scene, RESTING_BEAM, along.x, along.y)).toBeGreaterThan(0.9);
    expect(beamLight(scene, RESTING_BEAM, lantern.x + 0.3, lantern.y)).toBe(0);
    const [apex, left, right] = beamCone(scene, RESTING_BEAM);
    expect(apex).toEqual(lantern);
    expect(left.x).toBeLessThan(lantern.x);
    expect(right.x).toBeLessThan(lantern.x);
  });

  it('cuts ribbons whose thickness follows the tone and break on paper', () => {
    const lines = engrave(scene, { spacing: 0.02, step: 0.01 });
    expect(lines.length).toBeGreaterThan(45);
    const ribbons = lines.flat();
    expect(ribbons.length).toBeGreaterThan(lines.length);
    for (const ribbon of ribbons) {
      expect(ribbon.length % 2).toBe(0);
      const half = ribbon.length / 2;
      for (let i = 0; i < half; i += 1) {
        // Top edge left to right, bottom edge right to left: matching x, top above bottom.
        const top = ribbon[i];
        const bottom = ribbon[ribbon.length - 1 - i];
        expect(bottom.x).toBe(top.x);
        expect(bottom.y).toBeGreaterThan(top.y);
        expect(bottom.y - top.y).toBeLessThanOrEqual(0.02 * 0.92 + 1e-9);
      }
    }
  });

  it('prints less ink with the light lifted', () => {
    const ink = (lift: number) =>
      engrave(scene, { spacing: 0.02, step: 0.01, lift })
        .flat()
        .reduce((sum, ribbon) => {
          const half = ribbon.length / 2;
          let area = 0;
          for (let i = 0; i < half; i += 1) area += ribbon[ribbon.length - 1 - i].y - ribbon[i].y;
          return sum + area;
        }, 0);
    expect(ink(0.8)).toBeLessThan(ink(0) * 0.6);
  });
});
