import { describe, expect, it } from "vitest";
import {
  availableRanges,
  changeFromStart,
  lerpPoints,
  nearestIndex,
  resample,
  ridgePoints,
  sliceRange,
  smoothPath,
} from "./landscape.js";

const closes = (values: number[]) =>
  values.map((close, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, close }));

describe("market landscape geometry", () => {
  it("keeps the newest closes of a range and drops unusable ones", () => {
    const all = closes([10, Number.NaN, 11, 0, 12, 13]);
    expect(sliceRange(all, 2).map((c) => c.close)).toEqual([12, 13]);
    expect(sliceRange(all, 99).map((c) => c.close)).toEqual([10, 11, 12, 13]);
  });

  it("offers only ranges the stored history covers", () => {
    expect(availableRanges(30)).toEqual(["1M"]);
    expect(availableRanges(120)).toEqual(["1M", "3M", "6M"]);
    expect(availableRanges(400)).toEqual(["1M", "3M", "6M", "1Y"]);
  });

  it("puts the highest close at the top of the band and spans the full width", () => {
    const pts = ridgePoints(closes([1, 3, 2]), { width: 100, top: 10, bottom: 50 });
    expect(pts.map((p) => p.x)).toEqual([0, 50, 100]);
    expect(pts[1]!.y).toBe(10);
    expect(pts[0]!.y).toBe(50);
    expect(ridgePoints(closes([5]), { width: 100, top: 0, bottom: 1 })).toEqual([]);
  });

  it("resamples and morphs point for point", () => {
    const a = resample(
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      3,
    );
    expect(a).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 10 },
    ]);
    const b = a.map((p) => ({ x: p.x, y: p.y + 10 }));
    expect(lerpPoints(a, b, 0.5)[1]).toEqual({ x: 5, y: 10 });
  });

  it("draws a smooth path through every point", () => {
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ]);
    expect(d.startsWith("M0 0")).toBe(true);
    expect(d.endsWith("20 0")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });

  it("snaps the pointer to the nearest close and measures change from the range start", () => {
    expect(nearestIndex(0, 100, 5)).toBe(0);
    expect(nearestIndex(60, 100, 5)).toBe(2);
    expect(nearestIndex(500, 100, 5)).toBe(4);
    const c = closes([100, 110, 90]);
    expect(changeFromStart(c, 1)).toBeCloseTo(0.1);
    expect(changeFromStart(c, 2)).toBeCloseTo(-0.1);
    expect(changeFromStart([], 0)).toBeNull();
  });
});
