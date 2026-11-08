import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * useState persisted to sessionStorage for this tab (from CareerOS `use-session-state.ts`).
 * Hydrates after mount so server and first client render match.
 */
export function useSessionState<T>(
  key: string,
  fallback: T,
  options: { onStorageError?: (error: unknown) => void } = {},
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);
  const { onStorageError } = options;

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(key);
      if (saved !== null) setValue(JSON.parse(saved) as T);
    } catch (err) {
      onStorageError?.(err);
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      onStorageError?.(err);
    }
  }, [key, ready, value]);

  return [value, setValue];
}
