import { describe, it, expect } from "vitest";
import { mapToAllowedCategory, TRANSACTION_CATEGORIES } from "./schemas/categories.js";
import { ok, err } from "./types/index.js";

describe("mapToAllowedCategory", () => {
  it("maps known keywords to standard categories", () => {
    expect(mapToAllowedCategory("medical clinic")).toBe("Health");
    expect(mapToAllowedCategory("internal payment")).toBe("Transfers");
    expect(mapToAllowedCategory("starbucks coffee")).toBe("Food");
  });

  it("returns Other for unknown categories", () => {
    expect(mapToAllowedCategory("random")).toBe("Other");
  });
});

describe("TRANSACTION_CATEGORIES", () => {
  it("has ten standard categories", () => {
    expect(TRANSACTION_CATEGORIES).toHaveLength(10);
  });
});

describe("Result helpers", () => {
  it("creates ok and err results", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err("fail")).toEqual({ ok: false, error: "fail" });
  });
});
