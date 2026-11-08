import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiError } from '../fetch/apiError.js';
import { createFetchCache } from './fetchCache.js';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.useRealTimers();
});

describe('createFetchCache', () => {
  it('dedupes concurrent requests for the same path', async () => {
    let resolve!: (r: Response) => void;
    const fetchFn = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
    const cache = createFetchCache({ fetchFn });
    const a = cache.fetchCachedJson<{ n: number }>('/x');
    const b = cache.fetchCachedJson<{ n: number }>('/x');
    expect(cache.inflightCount()).toBe(1);
    resolve(json({ n: 1 }));
    expect(await a).toEqual({ n: 1 });
    expect(await b).toEqual({ n: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(cache.inflightCount()).toBe(0);
  });

  it('returns a fresh hit without refetching, refetches once stale', async () => {
    let t = 0;
    const fetchFn = vi.fn(async () => json({ v: t }));
    const cache = createFetchCache({ fetchFn, now: () => t, staleMs: 100 });
    await cache.fetchCachedJson('/a');
    t = 50;
    await cache.fetchCachedJson('/a');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    t = 200;
    expect(await cache.fetchCachedJson('/a')).toEqual({ v: 200 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('falls back to the stale value on error, or throws when fallbackToStale is false', async () => {
    let t = 0;
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ ok: 1 }))
      .mockRejectedValue(new Error('down'));
    const cache = createFetchCache({ fetchFn, now: () => t, staleMs: 10 });
    await cache.fetchCachedJson('/s');
    t = 100;
    expect(await cache.fetchCachedJson('/s')).toEqual({ ok: 1 });
    await expect(cache.fetchCachedJson('/s', { fallbackToStale: false })).rejects.toThrow('down');
  });

  it('throws ApiError with status and body on non-ok without a stale copy', async () => {
    const cache = createFetchCache({ fetchFn: async () => json({ error: 'nope' }, 503) });
    const err = await cache.fetchCachedJson('/e').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(503);
    expect((err as ApiError).body).toEqual({ error: 'nope' });
  });

  it('aborts the request after timeoutMs', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_r, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const cache = createFetchCache({ fetchFn });
    const p = cache.fetchCachedJson('/slow', { timeoutMs: 1000 });
    const assertion = expect(p).rejects.toThrow('aborted');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('invalidates by prefix, or everything with no prefix', () => {
    const cache = createFetchCache();
    cache.setCached('/api/a', 1);
    cache.setCached('/api/b', 2);
    cache.setCached('/other', 3);
    cache.invalidateCachedByPrefix('/api/');
    expect(cache.getCachedStale('/api/a')).toBeNull();
    expect(cache.getCachedStale('/api/b')).toBeNull();
    expect(cache.getCachedStale('/other')).toBe(3);
    cache.invalidateCachedByPrefix();
    expect(cache.getCachedStale('/other')).toBeNull();
  });

  it('applies baseUrl and unwrap', async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL) => json({ data: [1, 2] }));
    const cache = createFetchCache({
      fetchFn,
      baseUrl: 'https://api.test/',
      unwrap: (b) => (b as { data: unknown }).data,
    });
    expect(await cache.fetchCachedJson('items')).toEqual([1, 2]);
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain('api.test');
  });
});
