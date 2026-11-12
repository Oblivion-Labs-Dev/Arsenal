// Retry policy for one provider call: classify the failure, retry only what is transient, wait at
// least as long as the provider asked, stop when a breaker opens or the caller aborts. Built on
// the backend's existing `retryWithJitter`, so there is one retry loop in the codebase.

import { retryWithJitter } from '../../net/jitter.js';
import { sleep } from '../../utils/retry.js';
import type { CircuitBreaker } from './circuit-breaker.js';
import {
  classifyProviderFailure,
  ProviderError,
  type ProviderFailure,
} from './provider-failure.js';

export interface CallProviderOptions {
  /** Name used in errors and as the breaker key in logs. */
  provider?: string;
  /** Shared breaker for this provider; calls fail fast with `circuit_open` while it is open. */
  breaker?: CircuitBreaker;
  /** Total attempts including the first, at most 10. Default 3. Every retry is billed again. */
  attempts?: number;
  /** Smallest backoff (ms). Default 500. */
  baseMs?: number;
  /** Largest single wait (ms). Default 30 000. */
  maxMs?: number;
  /** A Retry-After longer than this gives up instead of waiting. Default `maxMs`. */
  maxRetryAfterMs?: number;
  signal?: AbortSignal;
  /** Called before each wait, e.g. to log or to show "retrying in 4s". */
  onRetry?: (failure: ProviderFailure, attempt: number, delayMs: number) => void;
  random?: () => number;
  /** Injected for tests. */
  sleepFn?: (ms: number) => Promise<void>;
}

const MAX_ATTEMPTS = 10;

function cancelled(provider: string | undefined, attempts: number, cause?: unknown) {
  return new ProviderError(
    {
      kind: 'cancelled',
      status: null,
      retryable: false,
      retryAfterMs: null,
      countsTowardBreaker: false,
      message: 'cancelled by the caller',
    },
    { provider, attempts, cause },
  );
}

function abortable(wait: (ms: number) => Promise<void>, signal: AbortSignal | undefined) {
  if (!signal) return wait;
  return (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      const onAbort = () => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
      wait(ms).then(
        () => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        },
        (error: unknown) => {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        },
      );
    });
}

/**
 * Runs `fn` with bounded, jittered retries. Always rejects with a `ProviderError` (original error
 * in `cause`), so callers branch on `error.kind` instead of parsing provider messages.
 */
export async function callProvider<T>(
  fn: (attempt: number, signal?: AbortSignal) => Promise<T>,
  options: CallProviderOptions = {},
): Promise<T> {
  const { provider, breaker, signal } = options;
  const attempts = Math.min(MAX_ATTEMPTS, Math.max(1, Math.floor(options.attempts ?? 3)));
  const maxMs = options.maxMs ?? 30_000;
  const maxRetryAfterMs = options.maxRetryAfterMs ?? maxMs;
  let lastAttempt = 0;

  try {
    return await retryWithJitter(
      async (attempt) => {
        lastAttempt = attempt;
        if (signal?.aborted) throw cancelled(provider, attempt, signal.reason);
        if (breaker && !breaker.tryAcquire()) {
          const retryAt = breaker.snapshot.retryAt;
          throw new ProviderError(
            {
              kind: 'circuit_open',
              status: null,
              retryable: false,
              retryAfterMs: retryAt === null ? null : Math.max(0, retryAt - Date.now()),
              countsTowardBreaker: false,
              message: `circuit open after ${breaker.snapshot.lastFailure?.kind ?? 'failures'}`,
            },
            { provider, attempts: attempt },
          );
        }
        try {
          const value = await fn(attempt, signal);
          breaker?.recordSuccess();
          return value;
        } catch (error) {
          const failure = signal?.aborted
            ? cancelled(provider, attempt).failure
            : classifyProviderFailure(error);
          if (failure.kind === 'cancelled') breaker?.release();
          else breaker?.recordFailure(failure);
          throw new ProviderError(failure, { provider, attempts: attempt, cause: error });
        }
      },
      {
        attempts,
        baseMs: options.baseMs ?? 500,
        maxMs,
        random: options.random,
        sleepFn: abortable(options.sleepFn ?? sleep, signal),
        shouldRetry: (error) => {
          if (!(error instanceof ProviderError) || !error.retryable || signal?.aborted)
            return false;
          const hint = error.failure.retryAfterMs;
          return hint === null || hint <= maxRetryAfterMs;
        },
        delayFor: (error, attempt, jittered) => {
          const failure = (error as ProviderError).failure;
          const delay = Math.min(maxMs, Math.max(jittered, failure.retryAfterMs ?? 0));
          options.onRetry?.(failure, attempt, delay);
          return delay;
        },
      },
    );
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    // Only the abortable wait can reject with something else: the caller aborted mid-backoff.
    throw cancelled(provider, lastAttempt, error);
  }
}
