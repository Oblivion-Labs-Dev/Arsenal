import type { JSONValue } from "@oblivion-labs-dev/arsenal-shared";

/** Returns true when running in a browser environment. */
export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Safely read a JSON value from localStorage.
 * Returns the fallback when storage is unavailable or parsing fails.
 */
export function readLocalStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely write a JSON-serializable value to localStorage.
 * Returns false when storage is unavailable or write fails.
 */
export function writeLocalStorage(key: string, value: JSONValue): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Remove a key from localStorage. Returns false when storage is unavailable. */
export function removeLocalStorage(key: string): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Read a raw string from localStorage. */
export function readLocalStorageString(key: string, fallback = ""): string {
  if (!isBrowser()) return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Write a raw string to localStorage. */
export function writeLocalStorageString(key: string, value: string): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Convenience object for localStorage operations. */
export const safeLocalStorage = {
  read: readLocalStorage,
  write: writeLocalStorage,
  remove: removeLocalStorage,
  readString: readLocalStorageString,
  writeString: writeLocalStorageString,
};
