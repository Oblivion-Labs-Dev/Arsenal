import type { JSONValue } from "@oblivion-labs/arsenal-shared";
import { useCallback, useEffect, useState } from "react";
import { safeLocalStorage } from "../storage/localStorage.js";

export interface UsePersistedStateOptions {
  /** Merge partial updates into the previous value. Default: true */
  merge?: boolean;
}

const subscribersByKey = new Map<string, Set<(value: unknown) => void>>();

function getSubscribers(key: string): Set<(value: unknown) => void> {
  let set = subscribersByKey.get(key);
  if (!set) {
    set = new Set();
    subscribersByKey.set(key, set);
  }
  return set;
}

/**
 * React state synced to localStorage with pub/sub across hook instances.
 */
export function usePersistedState<T extends Record<string, unknown>>(
  storageKey: string,
  defaultValue: T,
  options: UsePersistedStateOptions = {},
): [T, (patch: Partial<T> | T | ((prev: T) => T)) => void] {
  const { merge = true } = options;
  const subscribers = getSubscribers(storageKey);

  const read = (): T => {
    if (typeof window === "undefined") return defaultValue;
    const stored = safeLocalStorage.read<Record<string, unknown>>(storageKey, defaultValue);
    return { ...defaultValue, ...stored } as T;
  };

  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    const cb = (next: unknown) => setValue(next as T);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, [storageKey]);

  const setPersisted = useCallback(
    (patch: Partial<T> | T | ((prev: T) => T)) => {
      setValue((prev) => {
        let next: T;
        if (typeof patch === "function") {
          next = (patch as (prev: T) => T)(prev);
        } else if (merge && patch !== null && typeof patch === "object" && !Array.isArray(patch)) {
          next = { ...prev, ...(patch as Partial<T>) };
        } else {
          next = patch as T;
        }
        safeLocalStorage.write(storageKey, next as JSONValue);
        subscribers.forEach((cb) => cb(next));
        return next;
      });
    },
    [storageKey, merge],
  );

  return [value, setPersisted];
}

/** @internal exported for tests */
export function _resetPersistedStateSubscribers(): void {
  subscribersByKey.clear();
}
