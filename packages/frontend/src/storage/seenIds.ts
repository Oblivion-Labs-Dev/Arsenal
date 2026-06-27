import { safeLocalStorage } from "./localStorage.js";

/** Read a Set of string IDs from localStorage. */
export function readSeenIds(storageKey: string): Set<string> {
  const parsed = safeLocalStorage.read<string[]>(storageKey, []);
  return new Set(Array.isArray(parsed) ? parsed : []);
}

/** Mark one or more IDs as seen in localStorage. */
export function markIdsSeen(storageKey: string, ids: string[]): void {
  if (!ids.length) return;
  const seen = readSeenIds(storageKey);
  for (const id of ids) seen.add(id);
  safeLocalStorage.write(storageKey, [...seen]);
}

/** Clear all seen IDs for a storage key. */
export function clearSeenIds(storageKey: string): void {
  safeLocalStorage.remove(storageKey);
}
