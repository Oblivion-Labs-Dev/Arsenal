import { describe, expect, it } from "vitest";
import {
  GLOW_SHADERS,
  LIGHT_STRIDE,
  THREAD_SEGMENTS,
  THREAD_STRIDE,
  packLights,
  packThreads,
  threadPoint,
  type Light,
  type Thread,
} from "./glow-canvas";

describe("packThreads", () => {
  it("lays each thread out as from, to, rgb, alpha, half width, dotted", () => {
    const threads: Thread[] = [
      { from: [1, 2], to: [3, 4], color: [0.5, 0.25, 1], alpha: 0.75, width: 2 },
      { from: [5, 6], to: [7, 8], color: [0, 0, 0], alpha: 1, width: 3, dotted: true },
    ];
    const out = packThreads(threads);
    expect(out).toHaveLength(2 * THREAD_STRIDE);
    expect([...out.subarray(0, THREAD_STRIDE)]).toEqual([1, 2, 3, 4, 0.5, 0.25, 1, 0.75, 2, 0]);
    expect([...out.subarray(THREAD_STRIDE)]).toEqual([5, 6, 7, 8, 0, 0, 0, 1, 3, 1]);
  });
  it("is empty for no threads", () => {
    expect(packThreads([])).toHaveLength(0);
  });
});

describe("packLights", () => {
  it("lays each light out as x, y, radius, shape, rgb, alpha", () => {
    const lights: Light[] = [{ at: [10, 20], color: [1, 0.5, 0], radius: 30, alpha: 0.5, shape: 2 }];
    expect([...packLights(lights)]).toEqual([10, 20, 30, 2, 1, 0.5, 0, 0.5]);
    expect(LIGHT_STRIDE).toBe(8);
  });
});

describe("threadPoint", () => {
  it("starts and ends on the endpoints and leaves them level", () => {
    expect(threadPoint([0, 0], [100, 50], 0)).toEqual([0, 0]);
    expect(threadPoint([0, 0], [100, 50], 1)).toEqual([100, 50]);
    expect(threadPoint([0, 0], [100, 50], 0.5)).toEqual([50, 25]);
    const near = threadPoint([0, 0], [100, 50], 0.01);
    expect(near[1] / near[0]).toBeLessThan(0.05);
  });
});

describe("shaders", () => {
  it("match the instance layouts and segment count", () => {
    expect(GLOW_SHADERS.THREAD_VS).toContain(`/ ${THREAD_SEGMENTS}.`);
    expect(GLOW_SHADERS.THREAD_VS).toMatch(/location=2\) in vec2 aShape/);
    expect(GLOW_SHADERS.LIGHT_VS).toMatch(/location=1\) in vec4 aColor/);
  });
});
