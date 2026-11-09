import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMERA,
  HERO_PLATE,
  IDENTITY_POSE,
  cameraTarget,
  fitPlate,
  poseSettled,
  springStep,
  stageTransform,
  stepPose,
} from '../../src/index.js';

const rest = { pointer: { x: 0, y: 0 }, focus: null, packet: null, scroll: 0 };
const map = HERO_PLATE;
const offAxis = { x: 1399, y: 416 };

describe('plate camera', () => {
  it('holds the fitted composition at rest', () => {
    expect(cameraTarget(map, rest, { scale: 1 })).toEqual({ x: -0, y: -0, scale: 1 });
    const fit = fitPlate(map, 1440, 900);
    const t = stageTransform(map, fit, { width: 1440, height: 900 }, IDENTITY_POSE);
    expect(t.x).toBeCloseTo(fit.x, 6);
    expect(t.y).toBeCloseTo(fit.y, 6);
    expect(t.scale).toBe(1);
  });

  it('keeps pointer parallax small, against the pointer, and clamped', () => {
    const pose = cameraTarget(map, { ...rest, pointer: { x: 1, y: 1 } }, { scale: 1 });
    expect(pose.x).toBe(-DEFAULT_CAMERA.parallaxX);
    expect(pose.y).toBe(-DEFAULT_CAMERA.parallaxY);
    expect(cameraTarget(map, { ...rest, pointer: { x: 9, y: 9 } }, { scale: 1 })).toEqual(pose);
  });

  it('ignores non-finite input instead of throwing the camera away', () => {
    const pose = cameraTarget(
      map,
      { ...rest, pointer: { x: NaN, y: Infinity }, scroll: NaN },
      { scale: 1 },
    );
    expect(pose).toEqual({ x: -0, y: -0, scale: 1 });
  });

  it('draws the frame toward a focus point and zooms in a little; focus outweighs packet', () => {
    const pose = cameraTarget(map, { ...rest, focus: offAxis }, { scale: 1 });
    expect(Math.sign(pose.x)).toBe(Math.sign(map.sphere.x - offAxis.x));
    expect(pose.scale).toBeGreaterThan(1);
    expect(pose.scale).toBeLessThan(1.06);
    const both = cameraTarget(
      map,
      { ...rest, focus: offAxis, packet: { x: 900, y: 240 } },
      { scale: 1 },
    );
    expect(both).toEqual(pose);
    const packetOnly = cameraTarget(map, { ...rest, packet: offAxis }, { scale: 1 });
    expect(Math.abs(packetOnly.x)).toBeLessThan(Math.abs(pose.x));
  });

  it('accepts custom tuning', () => {
    const tuning = { ...DEFAULT_CAMERA, parallaxX: 0, parallaxY: 0 };
    expect(cameraTarget(map, { ...rest, pointer: { x: 1, y: 1 } }, { scale: 1 }, tuning)).toEqual({
      x: -0,
      y: -0,
      scale: 1,
    });
  });

  it('pushes in gradually as the hero scrolls away', () => {
    const half = cameraTarget(map, { ...rest, scroll: 0.5 }, { scale: 1 });
    const full = cameraTarget(map, { ...rest, scroll: 1 }, { scale: 1 });
    expect(half.scale).toBeGreaterThan(1);
    expect(full.scale).toBeGreaterThan(half.scale);
    expect(cameraTarget(map, { ...rest, scroll: 4 }, { scale: 1 })).toEqual(full);
  });

  it('springs to the target without overshoot and settles', () => {
    let x = 0;
    let v = 0;
    let peak = 0;
    for (let i = 0; i < 180; i++) {
      [x, v] = springStep(x, v, 10, 5.5, 1 / 60);
      peak = Math.max(peak, x);
    }
    expect(peak).toBeLessThanOrEqual(10 + 1e-9);
    expect(x).toBeCloseTo(10, 2);
    expect(
      poseSettled({ x, y: 0, scale: 1 }, { x: 10, y: 0, scale: 1 }, { x: v, y: 0, scale: 0 }),
    ).toBe(true);
    const [big] = springStep(0, 0, 10, 5.5, 1);
    expect(big).toBeGreaterThan(0);
    expect(big).toBeLessThanOrEqual(10);
  });

  it('stepPose moves every axis toward the goal', () => {
    const pose = { ...IDENTITY_POSE };
    const vel = { x: 0, y: 0, scale: 0 };
    const goal = { x: 8, y: -4, scale: 1.04 };
    for (let i = 0; i < 240; i++) stepPose(pose, vel, goal, 1 / 60);
    expect(poseSettled(pose, goal, vel)).toBe(true);
  });

  it('never pans the plate off an edge it covered', () => {
    for (const [w, h] of [
      [1440, 900],
      [1024, 768],
      [390, 360],
    ] as const) {
      const fit = fitPlate(map, w, h);
      for (const pan of [400, -400]) {
        const t = stageTransform(
          map,
          fit,
          { width: w, height: h },
          { x: pan, y: pan, scale: 1.03 },
        );
        const right = t.x + map.width * fit.scale * t.scale;
        const bottom = t.y + map.height * fit.scale * t.scale;
        if (fit.x <= 0) expect(t.x).toBeLessThanOrEqual(1e-6);
        if (fit.y <= 0) expect(t.y).toBeLessThanOrEqual(1e-6);
        if (fit.x + map.width * fit.scale >= w) expect(right).toBeGreaterThanOrEqual(w - 1e-6);
        if (fit.y + map.height * fit.scale >= h) expect(bottom).toBeGreaterThanOrEqual(h - 1e-6);
      }
    }
  });
});
