import { isBrowser } from "./localStorage.js";

/** Remove legacy keys from sessionStorage. */
export function clearSessionStorageKeys(keys: string[]): void {
  if (!isBrowser()) return;
  for (const key of keys) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/** Migrate a value from sessionStorage to localStorage when local is empty. */
export function migrateSessionToLocal(sessionKey: string, localKey: string): void {
  if (!isBrowser()) return;
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (!raw) return;
    if (!localStorage.getItem(localKey)) {
      localStorage.setItem(localKey, raw);
    }
    sessionStorage.removeItem(sessionKey);
  } catch {
    // ignore
  }
}
