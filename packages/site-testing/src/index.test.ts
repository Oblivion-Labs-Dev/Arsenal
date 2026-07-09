import { describe, expect, it } from "vitest";
import { LIGHTHOUSE_BUDGET, assertBudget } from "./index";

describe("Lighthouse budget", () => {
  it("defines performance targets", () => {
    expect(LIGHTHOUSE_BUDGET.performance).toBeGreaterThanOrEqual(90);
  });

  it("assertBudget passes when met", () => {
    expect(() => assertBudget(95, 90, "performance")).not.toThrow();
  });

  it("assertBudget fails when below", () => {
    expect(() => assertBudget(80, 90, "performance")).toThrow();
  });
});
