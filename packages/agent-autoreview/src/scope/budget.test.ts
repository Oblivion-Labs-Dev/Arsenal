import { describe, expect, it } from "vitest";
import { applyScopeBudget, isRiskExpansionTrigger } from "./budget.js";
import { DEFAULT_FAST_BUDGET, DEFAULT_THOROUGH_BUDGET } from "../config/defaults.js";

describe("scope budget enforcement", () => {
  it("truncates routes and records exclusions without expanding budget", () => {
    const ranked = applyScopeBudget(
      {
        changedFiles: Array.from({ length: 25 }, (_, i) => `src/a${i}.tsx`),
        affectedComponents: [],
        affectedRoutes: Array.from({ length: 8 }, (_, i) => ({
          path: `/r${i}`,
          reason: "imports changed component",
        })),
        supportingFiles: [],
        excludedFiles: [],
      },
      DEFAULT_FAST_BUDGET,
    );

    expect(ranked.changedFiles.length).toBe(DEFAULT_FAST_BUDGET.maxChangedSourceFiles);
    expect(ranked.affectedRoutes.length).toBe(DEFAULT_FAST_BUDGET.maxAffectedRoutes);
    expect(ranked.truncated).toBe(true);
    expect(ranked.excludedFiles.length).toBeGreaterThan(0);
  });

  it("thorough budget is larger than fast", () => {
    expect(DEFAULT_THOROUGH_BUDGET.maxScreenshots).toBeGreaterThan(DEFAULT_FAST_BUDGET.maxScreenshots);
    expect(DEFAULT_THOROUGH_BUDGET.maxDependencyDepth).toBeGreaterThan(
      DEFAULT_FAST_BUDGET.maxDependencyDepth,
    );
  });

  it("detects risk expansion triggers", () => {
    expect(isRiskExpansionTrigger("src/app/layout.tsx")).toBe(true);
    expect(isRiskExpansionTrigger("src/styles/globals.css")).toBe(true);
    expect(isRiskExpansionTrigger("src/components/Card.tsx")).toBe(false);
  });
});
