import { describe, expect, it } from "vitest";
import { toRgba } from "./chart-colors.js";

describe("toRgba", () => {
  it("normalises the formats browsers return for computed colors", () => {
    expect(toRgba("rgb(51, 99, 69)")).toBe("rgba(51, 99, 69, 1)");
    expect(toRgba("rgba(51, 99, 69, 0.5)")).toBe("rgba(51, 99, 69, 0.5)");
    expect(toRgba("rgb(51 99 69 / 50%)")).toBe("rgba(51, 99, 69, 0.5)");
    expect(toRgba("#336345")).toBe("rgba(51, 99, 69, 1)");
    expect(toRgba("color(srgb 1 0 0.5 / 0.4)")).toBe("rgba(255, 0, 128, 0.4)");
  });
  it("applies an extra opacity on top of the color's own alpha", () => {
    expect(toRgba("rgba(0, 0, 0, 0.5)", 0.5)).toBe("rgba(0, 0, 0, 0.25)");
    expect(toRgba("#000000", 0.35)).toBe("rgba(0, 0, 0, 0.35)");
  });
  it("returns null for formats the chart library cannot use", () => {
    expect(toRgba("oklch(0.6 0.1 150)")).toBeNull();
    expect(toRgba("")).toBeNull();
    expect(toRgba("light-dark(#000, #fff)")).toBeNull();
  });
});
