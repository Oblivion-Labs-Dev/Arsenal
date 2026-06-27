/** Light/dark theme mode. */
export type ThemeMode = "light" | "dark";

/** Generic select option shape. */
export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

/** Base props shared by card-style UI components. */
export interface BaseComponentProps {
  className?: string;
  children?: unknown;
}

/** Severity levels for alerts and insights. */
export type SeverityLevel = "info" | "warning" | "critical";

/** Impact levels for recommendations. */
export type ImpactLevel = "low" | "medium" | "high";
