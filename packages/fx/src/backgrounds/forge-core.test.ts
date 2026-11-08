import { describe, expect, it } from 'vitest';
import {
  FORGE_RINGS,
  createForgeCore,
  emberHeat,
  emberRadius,
  hexPerimeterPoint,
  sparkPosition,
  stepForgeCore,
} from './forge-core';

describe('hexPerimeterPoint', () => {
  it('starts at the top vertex and passes through each vertex', () => {
    const top = hexPerimeterPoint(0, 10);
    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-10);
    const second = hexPerimeterPoint(1 / 6, 10);
    expect(Math.hypot(second.x, second.y)).toBeCloseTo(10);
    expect(second.x).toBeGreaterThan(0);
    expect(hexPerimeterPoint(1, 10).y).toBeCloseTo(-10);
  });

  it('keeps every point between the apothem and the circumradius', () => {
    const apothem = 10 * Math.cos(Math.PI / 6);
    for (let i = 0; i < 120; i += 1) {
      const p = hexPerimeterPoint(i / 120, 10, 0.4);
      const d = Math.hypot(p.x, p.y);
      expect(d).toBeGreaterThanOrEqual(apothem - 1e-9);
      expect(d).toBeLessThanOrEqual(10 + 1e-9);
    }
  });
});

describe('forge core field', () => {
  it('is deterministic for a seed', () => {
    const a = createForgeCore(20, 10, 42);
    const b = createForgeCore(20, 10, 42);
    stepForgeCore(a, 1);
    stepForgeCore(b, 1);
    expect(a.sparks).toEqual(b.sparks);
  });

  it('puts sparks on every ring and embers spread over their lives', () => {
    const { sparks } = createForgeCore(20, 30, 7);
    for (let ring = 0; ring < FORGE_RINGS.length; ring += 1) {
      expect(sparks.some((s) => s.kind === 'orbit' && s.ring === ring)).toBe(true);
    }
    expect(sparks.filter((s) => s.kind === 'ember')).toHaveLength(30);
  });

  it('recycles embers at the rim and keeps everything in bounds over a long run', () => {
    const state = createForgeCore(10, 40, 3);
    const total = state.sparks.length;
    for (let frame = 0; frame < 3000; frame += 1) stepForgeCore(state, 2.4);
    expect(state.sparks).toHaveLength(total);
    for (const s of state.sparks) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(1);
      expect(s.life).toBeLessThan(1);
      const p = sparkPosition(s, 100, 12345);
      expect(Math.hypot(p.x, p.y)).toBeLessThan(115);
    }
  });

  it('embers fall from outside the rim to near the core and fade at both ends', () => {
    expect(emberRadius(0)).toBeGreaterThan(1);
    expect(emberRadius(1)).toBeLessThan(0.15);
    expect(emberHeat(0)).toBe(0);
    expect(emberHeat(1)).toBe(0);
    expect(emberHeat(0.7)).toBeGreaterThan(emberHeat(0.2));
  });
});
