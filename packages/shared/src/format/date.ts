import type { ISODateString } from "../types/index.js";

export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  locale?: string;
}

function parseCalendarDate(iso: string, day = 1): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00Z`);
  }
  if (/^\d{4}-\d{2}$/.test(iso)) {
    const paddedDay = String(day).padStart(2, "0");
    return new Date(`${iso}-${paddedDay}T12:00:00Z`);
  }
  return new Date(iso);
}

/** Format an ISO date string for display. */
export function formatDate(
  iso: ISODateString | string | null | undefined,
  opts: FormatDateOptions = { month: "short", day: "numeric" },
): string {
  if (!iso) return "";
  const { locale = "en-US", ...intlOpts } = opts;
  const d = parseCalendarDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { ...intlOpts, timeZone: "UTC" });
}

/** Format an ISO date as a short month + year label. */
export function formatMonth(iso: ISODateString | string | null | undefined, locale = "en-US"): string {
  if (!iso) return "";
  const d = parseCalendarDate(iso, 1);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { month: "short", year: "2-digit", timeZone: "UTC" });
}

/** Extract YYYY-MM from an ISO date string. */
export function monthKey(iso: ISODateString | string | null | undefined): string {
  return (iso ?? "").slice(0, 7);
}
