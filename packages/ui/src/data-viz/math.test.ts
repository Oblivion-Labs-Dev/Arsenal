import { describe, expect, it } from "vitest";
import { deltaText, easeOutCubic, ridgePath, sparkGeometry, tweenValue } from "./math";

describe("easing", () => {
  it("starts at the old value, ends exactly at the new one and clamps", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(tweenValue(10, 20, 1)).toBe(20);
    expect(tweenValue(10, 20, 0.5)).toBeGreaterThan(15); // ease-out is past halfway at t=0.5
  });
});

describe("deltaText", () => {
  it("formats fractions as signed percents with words for screen readers", () => {
    expect(deltaText(0.012)).toEqual({
      tone: "up",
      arrow: "▲",
      visible: "+1.2%",
      spoken: "up 1.2 percent",
    });
    expect(deltaText(-0.034)).toMatchObject({ tone: "down", arrow: "▼", visible: "−3.4%" });
  });
  it("treats zero and changes that round to zero as unchanged, without an arrow", () => {
    expect(deltaText(0)).toMatchObject({ tone: "muted", arrow: "", spoken: "unchanged" });
    expect(deltaText(0.0001)).toMatchObject({ tone: "muted", arrow: "" });
  });
  it("formats money", () => {
    expect(deltaText(-12.5, "money")).toMatchObject({ visible: "−$12.50", spoken: "down $12.50" });
  });
});

describe("sparkGeometry", () => {
  it("draws nothing with fewer than two known values", () => {
    expect(sparkGeometry([1, null, Number.NaN], 100, 20)).toMatchObject({ lines: [], known: 1 });
  });
  it("splits the line at gaps and keeps x positions on the full index range", () => {
    const g = sparkGeometry([1, 2, null, 3, 4], 100, 20);
    expect(g.lines).toEqual(["M0,18 L25,12.67", "M75,7.33 L100,2"]);
    expect(g.areas[0]).toBe("M0,18 L25,12.67 L25,20 L0,20 Z");
    expect(g.last).toEqual({ x: 100, y: 2 });
    expect([g.first, g.lastValue, g.known]).toEqual([1, 4, 4]);
  });
  it("centres a flat series instead of dividing by zero", () => {
    expect(sparkGeometry([5, 5], 10, 20).lines).toEqual(["M0,10 L10,10"]);
  });
});

describe("ridgePath", () => {
  it("maps the series into the band, low values at the bottom", () => {
    expect(ridgePath([0, 10])).toBe("M0.0,82.0 L1000.0,48.0");
  });
  it("refuses short or non-finite series rather than inventing points", () => {
    expect(ridgePath([1])).toBe("");
    expect(ridgePath([1, Number.NaN, 2])).toBe("");
  });
});
