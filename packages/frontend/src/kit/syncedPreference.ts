import { useCallback, useSyncExternalStore } from 'react';

/**
 * A per-browser preference synced across every hook, component and tab
 * (from CareerOS `use-card-style.ts`). Falls back to memory when storage is blocked,
 * so a switch still works in the current tab.
 */

export interface SyncedPreferenceOptions<T> {
  key: string;
  defaultValue: T;
  /** Accepts only valid stored values; anything else reads as the default. */
  validate: (value: unknown) => value is T;
  /** Same-tab change event name. Default `arsenal:pref:<key>`. */
  eventName?: string;
  /** Called when storage read/write fails (private mode, quota). */
  onStorageError?: (error: unknown) => void;
}

export interface SyncedPreference<T> {
  read(): T;
  write(next: T): void;
  subscribe(onChange: () => void): () => void;
  usePreference(): [T, (next: T) => void];
}

export function createSyncedPreference<T>(
  options: SyncedPreferenceOptions<T>,
): SyncedPreference<T> {
  const { key, defaultValue, validate } = options;
  const eventName = options.eventName ?? `arsenal:pref:${key}`;
  let memory: { value: T } | null = null;

  function read(): T {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          if (validate(parsed)) return parsed;
        }
      } catch (err) {
        options.onStorageError?.(err);
      }
    }
    return memory ? memory.value : defaultValue;
  }

  function write(next: T): void {
    memory = { value: next };
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch (err) {
      options.onStorageError?.(err);
    }
    window.dispatchEvent(new Event(eventName));
  }

  function subscribe(onChange: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === key) onChange();
    };
    window.addEventListener(eventName, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(eventName, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }

  // useSyncExternalStore needs a stable snapshot for object values: cache by raw JSON.
  let lastJson: string | undefined;
  let lastValue: T = defaultValue;
  function snapshot(): T {
    const value = read();
    const json = JSON.stringify(value);
    if (json !== lastJson) {
      lastJson = json;
      lastValue = value;
    }
    return lastValue;
  }

  function usePreference(): [T, (next: T) => void] {
    const value = useSyncExternalStore(subscribe, snapshot, () => defaultValue);
    const set = useCallback((next: T) => write(next), []);
    return [value, set];
  }

  return { read: snapshot, write, subscribe, usePreference };
}
