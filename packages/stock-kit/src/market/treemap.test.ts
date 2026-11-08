import { describe, expect, it } from "vitest";
import { rectToPercent, squarify } from "./treemap.js";

describe("squarify", () => {
  it("fills the bounds with equal areas when weights are omitted", () => {
    const rects = squarify([{}, {}, {}, {}], 100, 80);
    expect(rects).toHaveLength(4);
    expect(rects.reduce((sum, rect) => sum + rect.width * rect.height, 0)).toBeCloseTo(8000);
    expect(rects.map((rect) => rect.width * rect.height)).toEqual([2000, 2000, 2000, 2000]);
    expect(
      rects.every(
        (rect) =>
          rect.x >= 0 &&
          rect.y >= 0 &&
          rect.x + rect.width <= 100.001 &&
          rect.y + rect.height <= 80.001,
      ),
    ).toBe(true);
  });

  it("uses supplied weights to determine cell area", () => {
    const [large, small] = squarify([{ weight: 3 }, { weight: 1 }], 120, 60);
    expect(large!.width * large!.height).toBeCloseTo(5400);
    expect(small!.width * small!.height).toBeCloseTo(1800);
  });

  it("returns empty bounds for unusable dimensions or weights", () => {
    expect(squarify([{}, {}], 0, 20)).toEqual([
      { x: 0, y: 0, width: 0, height: 0 },
      { x: 0, y: 0, width: 0, height: 0 },
    ]);
    expect(squarify([{ weight: 0 }, { weight: -2 }], 10, 10).every((r) => r.width === 0)).toBe(
      true,
    );
  });
});

describe("rectToPercent", () => {
  it("scales the vertical axis by the layout height, so the map fills the whole container", () => {
    const rects = squarify([{ weight: 1 }, { weight: 1 }, { weight: 1 }], 100, 56);
    const bottom = Math.max(...rects.map((r) => r.y + r.height));
    expect(bottom).toBeCloseTo(56);
    const last = rects.find((r) => Math.abs(r.y + r.height - 56) < 1e-6)!;
    const css = rectToPercent(last, 100, 56);
    expect(parseFloat(css.top) + parseFloat(css.height)).toBeCloseTo(100);
  });
});
