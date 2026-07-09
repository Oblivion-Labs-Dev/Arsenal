import { describe, expect, it } from "vitest";
import { generateDesignTokens } from "./index.js";

describe("design tokens", () => {
  it("generates scales from material and mood", () => {
    const tokens = generateDesignTokens({ material: "glass", mood: "luxury" });
    expect(tokens.spacing.md).toBeTruthy();
    expect(tokens.borderRadius.md).toBe("1rem");
    expect(tokens.motion.easing.default).toContain("cubic-bezier");
  });
});
