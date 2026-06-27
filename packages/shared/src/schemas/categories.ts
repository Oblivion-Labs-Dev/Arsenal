import { z } from "zod";

/** Standard transaction categories used across FinanceOS and related apps. */
export const TRANSACTION_CATEGORIES = [
  "Income",
  "Housing",
  "Food",
  "Transportation",
  "Shopping",
  "Bills & Utilities",
  "Health",
  "Entertainment",
  "Transfers",
  "Other",
] as const;

/** Union type of allowed transaction categories. */
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

/** Zod schema for validating transaction categories. */
export const transactionCategorySchema = z.enum(TRANSACTION_CATEGORIES);

/** Map arbitrary category strings to a standard allowed category. */
export function mapToAllowedCategory(cat: string): TransactionCategory {
  const c = (cat || "").toLowerCase().trim();
  if (c.includes("income") || c.includes("salary") || c.includes("paycheck")) return "Income";
  if (c.includes("housing") || c.includes("rent") || c.includes("mortgage") || c.includes("repairs"))
    return "Housing";
  if (
    c.includes("food") ||
    c.includes("dining") ||
    c.includes("groceries") ||
    c.includes("restaurant") ||
    c.includes("coffee") ||
    c.includes("starbucks") ||
    c.includes("sweetgreen")
  )
    return "Food";
  if (
    c.includes("transport") ||
    c.includes("gas") ||
    c.includes("car") ||
    c.includes("ride") ||
    c.includes("uber") ||
    c.includes("lyft") ||
    c.includes("fuel") ||
    c.includes("chevron") ||
    c.includes("shell")
  )
    return "Transportation";
  if (
    c.includes("shopping") ||
    c.includes("amazon") ||
    c.includes("target") ||
    c.includes("walmart") ||
    c.includes("retail")
  )
    return "Shopping";
  if (
    c.includes("bill") ||
    c.includes("utility") ||
    c.includes("utilities") ||
    c.includes("verizon") ||
    c.includes("internet") ||
    c.includes("phone")
  )
    return "Bills & Utilities";
  if (c.includes("health") || c.includes("medical") || c.includes("pharmacy")) return "Health";
  if (
    c.includes("entertainment") ||
    c.includes("subscription") ||
    c.includes("subscriptions") ||
    c.includes("netflix") ||
    c.includes("spotify") ||
    c.includes("movie") ||
    c.includes("game")
  )
    return "Entertainment";
  if (
    c.includes("transfer") ||
    c.includes("payments") ||
    c.includes("payment") ||
    c.includes("payup")
  )
    return "Transfers";
  return "Other";
}
