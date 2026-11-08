import { describe, expect, it } from "vitest";
import { cssVarRgb, isDarkColor, parseCssColor, rgb, toLinear } from "./color";

describe("parseCssColor", () => {
  it("parses long and short hex, with or without alpha", () => {
    expect(parseCssColor("#ff0000")).toEqual([1, 0, 0]);
    expect(parseCssColor("#0F0")).toEqual([0, 1, 0]);
    expect(parseCssColor("#0000ff80")).toEqual([0, 0, 1]);
  });
  it("parses rgb() and rgba()", () => {
    expect(parseCssColor("rgb(255, 0, 255)")).toEqual([1, 0, 1]);
    expect(parseCssColor("rgba(0 255 0 / 0.5)")).toEqual([0, 1, 0]);
  });
  it("returns null for what it cannot read", () => {
    expect(parseCssColor("")).toBeNull();
    expect(parseCssColor("oklch(0.7 0.1 200)")).toBeNull();
  });
});

describe("colour helpers", () => {
  it("linearises with gamma 2.2", () => {
    const [r, g, b] = toLinear([1, 0.5, 0]);
    expect(r).toBe(1);
    expect(g).toBeCloseTo(0.5 ** 2.2);
    expect(b).toBe(0);
  });
  it("tells dark from light backgrounds", () => {
    expect(isDarkColor([0.05, 0.05, 0.08])).toBe(true);
    expect(isDarkColor([0.96, 0.94, 0.9])).toBe(false);
  });
  it("falls back without a DOM", () => {
    expect(rgb("#000")).toEqual([0, 0, 0]);
    expect(rgb("teal", [0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
    expect(cssVarRgb("--arsenal-accent", [0, 1, 0])).toEqual([0, 1, 0]);
  });
});
