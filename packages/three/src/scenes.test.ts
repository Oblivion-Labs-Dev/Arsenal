import { describe, expect, it } from 'vitest';
import type { ArsenalThemeTokens } from '@arsenal/fx';
import { createAccretionDisk, orbitAt } from './accretion-disk';
import { rgbToUnit, scenePalette } from './scene-palette';
import { advanceIntro, sceneFrameloop } from './scene-loop';

const dark: ArsenalThemeTokens = {
  scheme: 'dark',
  background: [5, 7, 10],
  text: [241, 245, 249],
  accent: [56, 189, 248],
  violet: [139, 92, 246],
  cyan: [71, 230, 255],
  amber: [245, 158, 11],
  blue: [96, 165, 250],
};
const light: ArsenalThemeTokens = { ...dark, scheme: 'light', background: [251, 250, 247], text: [23, 23, 23], cyan: [3, 105, 161], violet: [109, 40, 217] };

describe('createAccretionDisk', () => {
  it('is deterministic for a seed and sized to the count', () => {
    const a = createAccretionDisk({ count: 500, seed: 3 });
    const b = createAccretionDisk({ count: 500, seed: 3 });
    expect(a.positions).toHaveLength(1500);
    expect(a.speeds).toHaveLength(500);
    expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
    expect(Array.from(createAccretionDisk({ count: 500, seed: 4 }).positions)).not.toEqual(Array.from(a.positions));
  });

  it('keeps every particle outside the horizon and inside the rim', () => {
    const { positions } = createAccretionDisk({ count: 2000, seed: 9 });
    for (let i = 0; i < 2000; i++) {
      const r = Math.hypot(positions[i * 3]!, positions[i * 3 + 2]!);
      expect(r).toBeGreaterThanOrEqual(1.2 - 1e-5);
      expect(r).toBeLessThanOrEqual(5.7 + 1e-5);
    }
  });

  it('orbits faster near the horizon (Keplerian) and scales with speed', () => {
    const { positions, speeds } = createAccretionDisk({ count: 2000, seed: 2 });
    const radius = (i: number) => Math.hypot(positions[i * 3]!, positions[i * 3 + 2]!);
    let inner = 0;
    let outer = 0;
    for (let i = 1; i < 2000; i++) {
      if (radius(i) < radius(inner)) inner = i;
      if (radius(i) > radius(outer)) outer = i;
    }
    expect(speeds[inner]!).toBeGreaterThan(speeds[outer]!);
    const fast = createAccretionDisk({ count: 2000, seed: 2, speed: 2 });
    expect(fast.speeds[0]!).toBeCloseTo(speeds[0]! * 2, 5);
  });

  it('orbitAt keeps the radius and matches a quarter turn', () => {
    const [x, z] = orbitAt(3, 0, Math.PI / 2, 1);
    expect(x).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(3, 6);
    const [x2, z2] = orbitAt(1.5, -2, 0.37, 11);
    expect(Math.hypot(x2, z2)).toBeCloseTo(2.5, 6);
  });
});

describe('scenePalette', () => {
  it('follows the page tokens: additive glow on dark, ink on light', () => {
    expect(scenePalette(dark)).toEqual({ core: dark.cyan, outer: dark.violet, void: [0, 0, 0], additive: true });
    expect(scenePalette(light)).toEqual({ core: light.cyan, outer: light.violet, void: light.text, additive: false });
  });

  it('keeps the portfolio presets, with deeper inks on light pages', () => {
    expect(scenePalette(dark, 'amber').core).toEqual([245, 158, 11]);
    expect(scenePalette(light, 'amber').core).toEqual([180, 83, 9]);
  });

  it('converts to unit floats', () => {
    expect(rgbToUnit([255, 0, 51])).toEqual([1, 0, 0.2]);
  });
});

describe('sceneFrameloop', () => {
  it('animates only when visible and motion is allowed', () => {
    expect(sceneFrameloop(true, false)).toBe('always');
    expect(sceneFrameloop(false, false)).toBe('demand');
    expect(sceneFrameloop(true, true)).toBe('demand');
  });
});

describe('advanceIntro', () => {
  it('finishes the grow-in within a few seconds even at 1 fps', () => {
    let v = 0;
    for (let i = 0; i < 4; i++) v = advanceIntro(v, 1);
    expect(v).toBeGreaterThan(0.9);
  });

  it('never jumps after a long pause and settles exactly at 1', () => {
    expect(advanceIntro(0, 30)).toBeLessThan(0.5);
    let v = 0;
    for (let i = 0; i < 600; i++) v = advanceIntro(v, 1 / 60);
    expect(v).toBe(1);
  });
});
