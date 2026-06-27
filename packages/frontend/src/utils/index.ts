/** No-op in SSR; useful for guarding browser-only effects in React. */
export function noop(): void {
  // intentionally empty
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Type-safe object key check. */
export function hasKey<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === "object" && obj !== null && key in obj;
}
