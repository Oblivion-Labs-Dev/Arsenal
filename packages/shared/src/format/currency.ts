export interface FormatCurrencyOptions {
  compact?: boolean;
  signed?: boolean;
  locale?: string;
  currency?: string;
}

const defaultUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const defaultUsdShort = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function getFormatters(locale = "en-US", currency = "USD") {
  if (locale === "en-US" && currency === "USD") {
    return { standard: defaultUsd, compact: defaultUsdShort };
  }
  return {
    standard: new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }),
    compact: new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }),
  };
}

/** Format a number as currency. */
export function formatCurrency(value: unknown, options: FormatCurrencyOptions = {}): string {
  const { compact = false, signed = false, locale = "en-US", currency = "USD" } = options;
  const n = Number(value ?? 0);
  const { standard, compact: compactFmt } = getFormatters(locale, currency);
  const fmt = compact ? compactFmt : standard;
  const neg = n < 0 ? "-" : "";
  const sign = signed && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  return neg + sign + fmt.format(abs === 0 ? 0 : abs);
}

/** Format spend amounts stored as negatives as positive currency. */
export function formatAmountSpend(amount: unknown, options: Omit<FormatCurrencyOptions, "signed"> = {}): string {
  return formatCurrency(Math.abs(Number(amount ?? 0)), options);
}

/** Format a percentage with optional sign prefix. */
export function formatPct(value: unknown, digits = 1): string {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}
