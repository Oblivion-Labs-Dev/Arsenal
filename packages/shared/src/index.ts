export type { Result, JSONPrimitive, JSONValue, Nullable, ISODateString, ISODateTimeString, Id } from "./types/index.js";
export { ok, err } from "./types/index.js";
export type { ThemeMode, SelectOption, BaseComponentProps, SeverityLevel, ImpactLevel } from "./types/ui.js";

export {
  TRANSACTION_CATEGORIES,
  transactionCategorySchema,
  mapToAllowedCategory,
  type TransactionCategory,
} from "./schemas/categories.js";

export {
  OPENROUTER_CHAT_COMPLETIONS_PATH,
  OPENROUTER_DEFAULT_BASE_URL,
  DEFAULT_LLM_TIMEOUT_MS,
  DEFAULT_RETRY_ATTEMPTS,
  TRANSIENT_HTTP_STATUS_CODES,
} from "./constants/index.js";

export { formatCurrency, formatAmountSpend, formatPct, type FormatCurrencyOptions } from "./format/currency.js";
export { formatDate, formatMonth, monthKey, type FormatDateOptions } from "./format/date.js";

export {
  FLOW_PERIOD_ALL,
  FLOW_PERIOD_LAST_12,
  FLOW_PERIOD_THIS_YEAR,
  availableYears,
  filterByPeriod,
  buildPeriodOptions,
  type PeriodOption,
} from "./date/periodFilters.js";
