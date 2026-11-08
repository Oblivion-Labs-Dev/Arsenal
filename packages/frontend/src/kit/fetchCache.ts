import { ApiError } from '../fetch/apiError.js';

/**
 * In-memory stale-while-revalidate JSON cache (memory only, never storage).
 *
 * Merged from CareerOS `client-fetch-cache.ts` (dedupe in-flight, stale-on-error,
 * timeout) and Sutra `api.ts` (last-good map shared with `useLoad`, prefix clear).
 */

export const DEFAULT_STALE_MS = 30_000;
export const DEFAULT_FETCH_TIMEOUT_MS = 8_000;

export interface FetchCacheOptions {
  /** Prefixed to relative request paths. Default "". */
  baseUrl?: string;
  /** Default freshness window in ms. */
  staleMs?: number;
  /** Default timeout per request in ms. */
  timeoutMs?: number;
  /** Extra RequestInit applied to every request (e.g. `credentials`). */
  init?: Omit<RequestInit, 'signal' | 'method' | 'body'>;
  /** Unwraps a response envelope, e.g. `(body) => body.data`. Throw to signal an error. */
  unwrap?: (body: unknown) => unknown;
  /** Injectable for tests or non-browser runtimes. */
  fetchFn?: typeof fetch;
  /** Injectable clock for tests. */
  now?: () => number;
}

export interface FetchCachedJsonOptions {
  staleMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Return the last good value when the request fails. Default true. */
  fallbackToStale?: boolean;
}

export interface FetchCache {
  /** Fresh value (within `maxAgeMs`) or null. */
  getCached<T>(key: string, maxAgeMs?: number): T | null;
  /** Last good value regardless of age, or null. */
  getCachedStale<T>(key: string): T | null;
  setCached<T>(key: string, data: T): void;
  invalidateCached(key: string): void;
  /** Drops every key starting with `prefix`; no prefix clears everything. */
  invalidateCachedByPrefix(prefix?: string): void;
  /**
   * GET JSON with caching: returns a fresh hit, dedupes concurrent requests for the
   * same URL, and falls back to the last good value if the network fails. With no
   * stale copy the error is thrown (ApiError for HTTP failures).
   */
  fetchCachedJson<T>(path: string, options?: FetchCachedJsonOptions): Promise<T>;
  /** Number of requests currently in flight (for diagnostics/tests). */
  inflightCount(): number;
}

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

export function createFetchCache(options: FetchCacheOptions = {}): FetchCache {
  const baseUrl = (options.baseUrl ?? '').replace(/\/$/, '');
  const defaultStaleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<unknown>>();

  const resolveUrl = (path: string): string =>
    /^https?:\/\//.test(path) || !baseUrl
      ? path
      : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const getCached = <T>(key: string, maxAgeMs = defaultStaleMs): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (now() - entry.fetchedAt > maxAgeMs) return null;
    return entry.data as T;
  };

  const getCachedStale = <T>(key: string): T | null => {
    const entry = cache.get(key);
    return entry ? (entry.data as T) : null;
  };

  const setCached = <T>(key: string, data: T): void => {
    cache.set(key, { data, fetchedAt: now() });
  };

  const invalidateCached = (key: string): void => {
    cache.delete(key);
  };

  const invalidateCachedByPrefix = (prefix?: string): void => {
    if (!prefix) {
      cache.clear();
      return;
    }
    for (const key of [...cache.keys()]) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  };

  async function request(key: string, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
    const fetchFn = options.fetchFn ?? globalThis.fetch;
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const res = await fetchFn(resolveUrl(key), {
        cache: 'no-store',
        ...options.init,
        method: 'GET',
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        throw new ApiError(`Request failed (${res.status}): ${key}`, { status: res.status, body });
      }
      const data = options.unwrap ? options.unwrap(body) : body;
      setCached(key, data);
      return data;
    } finally {
      globalThis.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  async function fetchCachedJson<T>(path: string, opts: FetchCachedJsonOptions = {}): Promise<T> {
    const fresh = getCached<T>(path, opts.staleMs ?? defaultStaleMs);
    if (fresh !== null) return fresh;
    const stale = getCachedStale<T>(path);

    let promise = inflight.get(path);
    if (!promise) {
      promise = request(path, opts.timeoutMs ?? defaultTimeoutMs, opts.signal).finally(() => {
        inflight.delete(path);
      });
      inflight.set(path, promise);
    }

    try {
      return (await promise) as T;
    } catch (err) {
      if (stale !== null && opts.fallbackToStale !== false) return stale;
      throw err;
    }
  }

  return {
    getCached,
    getCachedStale,
    setCached,
    invalidateCached,
    invalidateCachedByPrefix,
    fetchCachedJson,
    inflightCount: () => inflight.size,
  };
}

/** Shared page-level cache instance. Create your own with `createFetchCache` for a base URL or envelope. */
export const defaultFetchCache: FetchCache = createFetchCache();

export const getCached = defaultFetchCache.getCached;
export const getCachedStale = defaultFetchCache.getCachedStale;
export const setCached = defaultFetchCache.setCached;
export const invalidateCached = defaultFetchCache.invalidateCached;
export const invalidateCachedByPrefix = defaultFetchCache.invalidateCachedByPrefix;
export const fetchCachedJson = defaultFetchCache.fetchCachedJson;
