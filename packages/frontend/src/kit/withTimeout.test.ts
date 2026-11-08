import { describe, it, expect, vi, afterEach } from 'vitest';
import { OperationTimeoutError, isOperationTimeoutError, withTimeout } from './withTimeout.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve(5), 100, 'x')).resolves.toBe(5);
  });

  it('passes rejections through', async () => {
    await expect(withTimeout(Promise.reject(new Error('x')), 100, 'x')).rejects.toThrow('x');
  });

  it('rejects with OperationTimeoutError after the timeout', async () => {
    vi.useFakeTimers();
    const caught = withTimeout(new Promise<never>(() => {}), 2000, 'Sync').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(2000);
    const err = await caught;
    expect(err).toBeInstanceOf(OperationTimeoutError);
    expect(isOperationTimeoutError(err)).toBe(true);
    expect((err as OperationTimeoutError).message).toBe('Sync timed out after 2s');
    expect((err as OperationTimeoutError).timeoutMs).toBe(2000);
  });
});
