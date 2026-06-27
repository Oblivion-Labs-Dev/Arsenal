import { describe, it, expect } from "vitest";
import { formatCurrency, formatAmountSpend, formatPct } from "./format/currency.js";
import { formatDate, monthKey } from "./format/date.js";
import { filterByPeriod, FLOW_PERIOD_ALL } from "./date/periodFilters.js";

describe("formatCurrency", () => {
  it("formats USD values", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats spend amounts as positive", () => {
    expect(formatAmountSpend(-42)).toBe("$42.00");
  });
});

describe("formatPct", () => {
  it("returns em dash for invalid values", () => {
    expect(formatPct(null)).toBe("—");
  });
});

describe("monthKey", () => {
  it("extracts YYYY-MM", () => {
    expect(monthKey("2024-03-15")).toBe("2024-03");
  });
});

describe("filterByPeriod", () => {
  const items = [{ date: "2024-01-01" }, { date: "2023-01-01" }];

  it("returns all items for ALL period", () => {
    expect(filterByPeriod(items, FLOW_PERIOD_ALL, (i) => i.date)).toHaveLength(2);
  });
});

describe("formatDate", () => {
  it("formats ISO dates", () => {
    expect(formatDate("2024-03-15")).toContain("Mar");
  });
});
