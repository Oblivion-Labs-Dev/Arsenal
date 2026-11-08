import { describe, expect, it } from "vitest";
import { calculateDrawdown } from "./drawdown";

describe("calculateDrawdown", () => {
  it("measures below each running peak and identifies recovery", () => {
    const result = calculateDrawdown([
      { date: "a", equity: 100 },
      { date: "b", equity: 80 },
      { date: "c", equity: 90 },
      { date: "d", equity: 100 },
    ]);
    expect(result?.worst.drawdownPct).toBe(-20);
    expect(result?.recoveryDate).toBe("d");
  });
  it("keeps an unrecovered drawdown explicit and rejects short series", () => {
    expect(calculateDrawdown([{ date: "a", equity: 100 }])).toBeNull();
    expect(
      calculateDrawdown([
        { date: "a", equity: 100 },
        { date: "b", equity: 90 },
      ])?.recoveryDate,
    ).toBeNull();
  });
});
