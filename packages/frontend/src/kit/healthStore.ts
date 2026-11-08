import { useSyncExternalStore } from 'react';

/**
 * Ref-counted backend health poller (from CareerOS `backend-status-store.ts`).
 * Polling only runs while at least one subscriber exists and the tab is visible;
 * it speeds up while offline so recovery shows quickly.
 */

/** `null` = not checked yet (unknown), never guessed. */
export type HealthStatus = boolean | null;

export interface HealthStoreOptions {
  url: string;
  /** Poll interval while online. Default 15s. */
  intervalMs?: number;
  /** Poll interval while offline. Default 3s. */
  offlineIntervalMs?: number;
  /** Per-check timeout. Default 5s. */
  timeoutMs?: number;
  /** Decides health from a response. Default: `res.ok`. */
  isHealthy?: (res: Response) => boolean | Promise<boolean>;
  /** Called with the reason whenever a check fails (network error, timeout, bad status). */
  onError?: (error: unknown) => void;
  fetchFn?: typeof fetch;
}

export interface HealthStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): HealthStatus;
  getServerSnapshot(): HealthStatus;
  /** Last failure reason, or null after a successful check. */
  getLastError(): unknown;
  /** Run a check now; resolves with the new status. */
  refresh(): Promise<boolean>;
  /** React hook: current status, subscribing while mounted. */
  useStatus(): HealthStatus;
}

export function createHealthStore(options: HealthStoreOptions): HealthStore {
  const intervalMs = options.intervalMs ?? 15_000;
  const offlineIntervalMs = options.offlineIntervalMs ?? 3_000;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const listeners = new Set<() => void>();
  let online: HealthStatus = null;
  let lastError: unknown = null;
  let pollId: ReturnType<typeof setInterval> | null = null;

  const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

  async function check(): Promise<boolean> {
    const fetchFn = options.fetchFn ?? globalThis.fetch;
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchFn(options.url, { cache: 'no-store', signal: controller.signal });
      const healthy = options.isHealthy ? await options.isHealthy(res) : res.ok;
      lastError = healthy ? null : new Error(`Health check failed (${res.status})`);
    } catch (err) {
      lastError = err;
    } finally {
      globalThis.clearTimeout(timer);
    }
    if (lastError !== null) options.onError?.(lastError);
    return lastError === null;
  }

  function resetInterval(): void {
    if (pollId !== null) {
      globalThis.clearInterval(pollId);
      pollId = null;
    }
    if (listeners.size > 0) {
      pollId = globalThis.setInterval(poll, online === false ? offlineIntervalMs : intervalMs);
    }
  }

  async function refresh(): Promise<boolean> {
    const next = await check();
    if (next !== online) {
      online = next;
      for (const l of [...listeners]) l();
      resetInterval();
    }
    return next;
  }

  function poll(): void {
    if (visible()) void refresh();
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (listeners.size === 1) {
      poll();
      resetInterval();
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', poll);
    }
    return () => {
      if (!listeners.delete(listener)) return;
      if (listeners.size === 0) {
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', poll);
        if (pollId !== null) {
          globalThis.clearInterval(pollId);
          pollId = null;
        }
      }
    };
  }

  const getSnapshot = () => online;
  const getServerSnapshot = (): HealthStatus => null;

  return {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    getLastError: () => lastError,
    refresh,
    useStatus: () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
  };
}
