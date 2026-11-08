import { describe, it, expect, vi, afterEach } from 'vitest';
import { createBatcher } from './batchedObserver.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('createBatcher', () => {
  it('debounces and dedupes items into one batch', async () => {
    vi.useFakeTimers();
    const process = vi.fn();
    const b = createBatcher<number>({ debounceMs: 100, process });
    b.add(1);
    await vi.advanceTimersByTimeAsync(50);
    b.addMany([1, 2, 3]);
    expect(b.size()).toBe(3);
    await vi.advanceTimersByTimeAsync(200);
    expect(process).toHaveBeenCalledTimes(1);
    expect(process).toHaveBeenCalledWith([1, 2, 3]);
    expect(b.size()).toBe(0);
  });

  it('puts items added during processing into the next batch', async () => {
    const seen: number[][] = [];
    const b = createBatcher<number>({
      process: (items) => {
        seen.push(items);
        if (items.includes(1)) b.add(9);
      },
    });
    b.add(1);
    await b.flush();
    await b.flush();
    expect(seen).toEqual([[1], [9]]);
    b.cancel();
  });

  it('reports process errors, and cancel drops pending work', async () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    const b = createBatcher<string>({
      process: () => {
        throw new Error('bad');
      },
      onError,
    });
    b.add('x');
    await b.flush();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'bad' }));
    b.add('y');
    b.cancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
