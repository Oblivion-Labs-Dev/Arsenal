import { describe, expect, it } from "vitest";
import {
  BLOOM,
  BLOOM_LEVELS,
  BLOOM_TAIL,
  BLOOM_WEIGHT,
  DEFAULT_UNFILTERABLE,
  DOWNSAMPLE,
  FULLSCREEN,
  PREFILTER,
  TONE,
  UPSAMPLE,
  bloomWeight,
  parseBindings,
} from "./gpu-stage";

describe("WGSL sources", () => {
  it("declare the expected entry points", () => {
    for (const pass of [PREFILTER, DOWNSAMPLE, UPSAMPLE]) expect(pass).toMatch(/@fragment fn fs_main/);
    expect(FULLSCREEN).toMatch(/@vertex fn vs_full/);
    expect(TONE).toMatch(/fn agx\(/);
    expect(TONE).toMatch(/fn encode\(/);
    expect(UPSAMPLE).toContain(String(BLOOM_TAIL));
  });
});

describe("bloomWeight", () => {
  it("matches the inlined BLOOM_WEIGHT constant", () => {
    expect(bloomWeight(BLOOM_LEVELS, BLOOM_TAIL).toFixed(4)).toBe(BLOOM_WEIGHT);
  });
  it("is the level count for a flat tail and rejects zero levels", () => {
    expect(bloomWeight(4, 1)).toBe(4);
    expect(() => bloomWeight(0, 2)).toThrow(RangeError);
  });
});

describe("parseBindings", () => {
  it("reads uniform, texture and sampler declarations in order", () => {
    const code = `
@group(0) @binding(0) var<uniform> scene: Scene;
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;
@group(1) @binding(0) var other: sampler;`;
    expect(parseBindings(code)).toEqual([
      { binding: 0, name: "scene", type: "Scene", kind: "uniform" },
      { binding: 1, name: "src", type: "texture_2d<f32>", kind: "texture" },
      { binding: 2, name: "linear", type: "sampler", kind: "sampler" },
    ]);
  });
  it("finds the bloom chain's texture and sampler", () => {
    const names = parseBindings(BLOOM).map((b) => b.name);
    expect(names).toContain("src");
    expect(names).toContain("linear");
  });
  it("marks ping-pong state textures unfilterable by default", () => {
    expect(DEFAULT_UNFILTERABLE.test("stateA")).toBe(true);
    expect(DEFAULT_UNFILTERABLE.test("srcB")).toBe(true);
    expect(DEFAULT_UNFILTERABLE.test("src")).toBe(false);
  });
});
