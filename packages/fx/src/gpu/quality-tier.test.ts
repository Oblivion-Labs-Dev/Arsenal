import { describe, expect, it } from "vitest";
import { DEFAULT_FRAME_BUDGET_MS, medianFrameMs, nextTier, type QualityTier } from "./quality-tier";

const LADDER = ["full", "half", "minimal"] as const;

describe("medianFrameMs", () => {
  it("is null with no finite samples", () => {
    expect(medianFrameMs([])).toBeNull();
    expect(medianFrameMs([Number.NaN, Number.POSITIVE_INFINITY])).toBeNull();
  });
  it("takes the middle of the sorted samples, ignoring non-finite ones", () => {
    expect(medianFrameMs([9, 1, 5])).toBe(5);
    expect(medianFrameMs([3, Number.NaN, 1, 2])).toBe(2);
  });
});

describe("nextTier", () => {
  it("stays put within budget or with no samples", () => {
    expect(nextTier(LADDER, "full", [1, 2, 3])).toBe("full");
    expect(nextTier(LADDER, "full", [DEFAULT_FRAME_BUDGET_MS])).toBe("full");
    expect(nextTier(LADDER, "half", [])).toBe("half");
  });
  it("steps down one rung when the median is over budget", () => {
    expect(nextTier(LADDER, "full", [10, 12, 1])).toBe("half");
    expect(nextTier(LADDER, "half", [10, 12, 11])).toBe("minimal");
  });
  it("honours a custom budget", () => {
    expect(nextTier(LADDER, "full", [6, 6, 6], 8)).toBe("full");
    expect(nextTier(LADDER, "full", [6, 6, 6], 5)).toBe("half");
  });
  it("never goes below the last rung", () => {
    expect(nextTier(LADDER, "minimal", [100, 100])).toBe("minimal");
  });
  it("works with tier objects", () => {
    const tiers: QualityTier<{ scale: number }>[] = [
      { id: "a", settings: { scale: 1 } },
      { id: "b", settings: { scale: 0.5 } },
    ];
    expect(nextTier(tiers, tiers[0]!, [50]).id).toBe("b");
  });
  it("throws when the current tier is not on the ladder", () => {
    expect(() => nextTier<string>(LADDER, "ultra", [1])).toThrow(/not on the ladder/);
  });
});
