/** Discriminated success/failure result type. */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Create a successful result. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Create a failed result. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** JSON-serializable primitive values. */
export type JSONPrimitive = string | number | boolean | null;

/** Recursive JSON value type. */
export type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue };

/** Nullable type helper. */
export type Nullable<T> = T | null | undefined;

/** ISO 8601 date string (YYYY-MM-DD). */
export type ISODateString = string;

/** ISO 8601 datetime string. */
export type ISODateTimeString = string;

/** Generic identifier string. */
export type Id = string;
