import { describe, expect, it } from "vitest";
import { EASE, MOTION, MOTION_CSS } from "./tokens.js";

describe("ClayFlow motion tokens", () => {
  it("keeps each default within its range", () => {
    for (const token of Object.values(MOTION)) {
      expect(token.default).toBeGreaterThanOrEqual(token.min);
      expect(token.default).toBeLessThanOrEqual(token.max);
    }
  });

  it("publishes every duration and easing token and zeros durations for reduced motion", () => {
    for (const [name, token] of Object.entries(MOTION)) {
      expect(MOTION_CSS).toContain(`--cf-dur-${name}: ${token.default}ms`);
      expect(MOTION_CSS).toContain(`--cf-dur-${name}: 0ms`);
    }
    for (const [name, value] of Object.entries(EASE)) expect(MOTION_CSS).toContain(`--cf-ease-${name}: ${value}`);
    expect(MOTION_CSS).toContain("prefers-reduced-motion: reduce");
  });
});
