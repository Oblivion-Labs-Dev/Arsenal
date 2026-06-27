export const FLOW_PERIOD_ALL = "ALL";
export const FLOW_PERIOD_LAST_12 = "LAST_12";
export const FLOW_PERIOD_THIS_YEAR = "THIS_YEAR";

export interface PeriodOption {
  value: string;
  label: string;
}

/** Collect distinct years from items with a date accessor. */
export function availableYears<T>(items: T[], getDate: (item: T) => string): number[] {
  const set = new Set<number>();
  for (const item of items) {
    const y = new Date(getDate(item)).getFullYear();
    if (!Number.isNaN(y)) set.add(y);
  }
  return Array.from(set).sort((a, b) => b - a);
}

/** Filter items by a flow period token. */
export function filterByPeriod<T>(
  items: T[],
  period: string | null | undefined,
  getDate: (item: T) => string,
  now: Date = new Date(),
): T[] {
  if (!period || period === FLOW_PERIOD_ALL) return items;

  if (period === FLOW_PERIOD_THIS_YEAR) {
    const y = now.getFullYear();
    return items.filter((item) => new Date(getDate(item)).getFullYear() === y);
  }

  if (period === FLOW_PERIOD_LAST_12) {
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 12);
    return items.filter((item) => new Date(getDate(item)) >= cutoff);
  }

  if (period.startsWith("year:")) {
    const y = Number(period.slice(5));
    if (!Number.isNaN(y)) {
      return items.filter((item) => new Date(getDate(item)).getFullYear() === y);
    }
  }

  return items;
}

/** Build select options for flow period filters. */
export function buildPeriodOptions<T>(
  items: T[],
  getDate: (item: T) => string,
  labels: { all: string; thisYear: string; last12: string } = {
    all: "All time",
    thisYear: "This year",
    last12: "Last 12 months",
  },
): PeriodOption[] {
  const years = availableYears(items, getDate);
  return [
    { value: FLOW_PERIOD_ALL, label: labels.all },
    { value: FLOW_PERIOD_THIS_YEAR, label: labels.thisYear },
    { value: FLOW_PERIOD_LAST_12, label: labels.last12 },
    ...years.map((y) => ({ value: `year:${y}`, label: String(y) })),
  ];
}
