import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultFetchCache, type FetchCache } from './fetchCache.js';

/** From Sutra `api.ts`: stale-while-revalidate loader with polling, abort and race safety. */

export interface UseLoadOptions {
  /** Re-run every `pollMs` while the tab is visible (and on return to the tab). */
  pollMs?: number;
  /** Identity of the data; a change resets state and reloads. */
  key?: string;
  /** Paint the last good value stored under this key at once, then refresh behind it. */
  cacheKey?: string;
  /** Cache that stores last-good values. Default: the shared page cache. */
  cache?: FetchCache;
}

export interface UseLoadResult<T> {
  data: T | null;
  /** Message of the last failure; cleared on the next success. */
  error: string | null;
  /** True only while there is no data to show yet. */
  loading: boolean;
  /** True while any request (including background refreshes) is running. */
  isValidating: boolean;
  reload: () => Promise<void>;
  /** Optimistically replace the data (and cached copy); optionally revalidate. */
  mutate: (updater: T | ((current: T | null) => T), revalidate?: boolean) => void;
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

export function useLoad<T>(
  load: (signal: AbortSignal) => Promise<T>,
  options: UseLoadOptions = {},
): UseLoadResult<T> {
  const { pollMs, key = '', cacheKey, cache = defaultFetchCache } = options;
  const cached = (): T | null =>
    cacheKey === undefined ? null : cache.getCachedStale<T>(cacheKey);

  const [data, setData] = useState<T | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => cached() === null);
  const [isValidating, setIsValidating] = useState(true);

  const request = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;
  const loadRef = useRef(load);
  loadRef.current = load;
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const dataRef = useRef(data);
  dataRef.current = data;

  const reload = useCallback(async () => {
    const version = ++request.current;
    const requestedKey = keyRef.current;
    const current = () => version === request.current && requestedKey === keyRef.current;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsValidating(true);
    // Read from a ref, not inside a setData updater: updaters run on the next render,
    // after a fast answer's setLoading(false), and would win.
    if (dataRef.current === null) setLoading(true);

    try {
      const result = await loadRef.current(controller.signal);
      if (current()) {
        setData(result);
        setError(null);
        if (cacheKeyRef.current !== undefined)
          cacheRef.current.setCached(cacheKeyRef.current, result);
      }
    } catch (e) {
      if (isAbortError(e)) return;
      if (current()) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (current()) {
        setLoading(false);
        setIsValidating(false);
      }
    }
  }, []);

  const mutate = useCallback(
    (updater: T | ((current: T | null) => T), revalidate = false) => {
      const prev = dataRef.current;
      const next =
        typeof updater === 'function' ? (updater as (current: T | null) => T)(prev) : updater;
      dataRef.current = next;
      setData(next);
      if (cacheKeyRef.current !== undefined) cacheRef.current.setCached(cacheKeyRef.current, next);
      if (revalidate) void reload();
    },
    [reload],
  );

  useEffect(() => {
    // A different key is different data: show its cached copy if any, never the old key's.
    const initial = cached();
    setData(initial);
    setLoading(initial === null);
    setError(null);
    void reload();
    const refreshVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void reload();
    };
    const id = pollMs ? globalThis.setInterval(refreshVisible, pollMs) : undefined;
    if (pollMs && typeof document !== 'undefined')
      document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      if (id !== undefined) globalThis.clearInterval(id);
      if (pollMs && typeof document !== 'undefined')
        document.removeEventListener('visibilitychange', refreshVisible);
      abortRef.current?.abort();
      request.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, pollMs, key]);

  return { data, error, loading, isValidating, reload, mutate };
}

/** GET JSON through the cache; the last result paints immediately while a fresh copy loads. */
export function useCachedJson<T>(
  path: string,
  options: { pollMs?: number; cache?: FetchCache; timeoutMs?: number } = {},
): UseLoadResult<T> {
  const cache = options.cache ?? defaultFetchCache;
  return useLoad<T>(
    (signal) => {
      // Always hit the network and surface failures: the hook itself paints the stale copy.
      return cache.fetchCachedJson<T>(path, {
        signal,
        timeoutMs: options.timeoutMs,
        staleMs: 0,
        fallbackToStale: false,
      });
    },
    { pollMs: options.pollMs, key: path, cacheKey: path, cache },
  );
}
