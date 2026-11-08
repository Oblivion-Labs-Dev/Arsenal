import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHealthStore } from './healthStore.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('createHealthStore', () => {
  it('is null until the first check and ref-counts polling', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(async () => new Response('ok', { status: 200 }));
    const store = createHealthStore({ url: '/health', intervalMs: 1000, fetchFn });
    expect(store.getSnapshot()).toBeNull();

    const l1 = vi.fn();
    const l2 = vi.fn();
    const off1 = store.subscribe(l1);
    const off2 = store.subscribe(l2);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1); // the second subscriber does not start another poll
    expect(store.getSnapshot()).toBe(true);
    expect(l1).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(l1).toHaveBeenCalledTimes(1); // unchanged status: no notification

    off1();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    off2();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(3); // the last unsubscribe stops polling
  });

  it('reports failures through onError and getLastError', async () => {
    const onError = vi.fn();
    const store = createHealthStore({
      url: '/health',
      fetchFn: async () => new Response('', { status: 500 }),
      onError,
    });
    await store.refresh();
    expect(store.getSnapshot()).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(String(store.getLastError())).toContain('500');
  });
});
