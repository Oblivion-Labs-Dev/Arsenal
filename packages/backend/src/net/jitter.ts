// Retry jitter for distributed back-off, ported from Sutra packages/core/src/jitter.ts.
// Spreads concurrent retries out so they do not hit a recovering service in lockstep.
import { sleep, type RetryOptions } from '../utils/retry.js';

/**
 * Decorrelated jitter: sleep = min(max, random_between(base, previous * 3)).
 * Delays grow while staying decorrelated across concurrent callers.
 */
export function decorrelatedJitter(
  baseMs: number,
  maxMs: number,
  previousDelayMs?: number,
  random: () => number = Math.random,
): number {
  const prev = previousDelayMs && previousDelayMs > 0 ? previousDelayMs : baseMs;
  const high = Math.max(baseMs, prev * 3);
  const spread = high - baseMs;
  const delay = baseMs + random() * spread;
  return Math.min(maxMs, Math.max(baseMs, Math.round(delay)));
}

/** Full jitter: sleep = random_between(0, min(max, base * 2 ** (attempt - 1))). */
export function fullJitter(
  baseMs: number,
  maxMs: number,
  attempt: number,
  random: () => number = Math.random,
): number {
  const cap = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(random() * cap);
}

export interface JitterRetryOptions extends Pick<RetryOptions, 'attempts' | 'shouldRetry'> {
  /** Smallest delay. Default 250. */
  baseMs?: number;
  /** Largest delay. Default 30000. */
  maxMs?: number;
  /** "decorrelated" (default) or "full". */
  strategy?: 'decorrelated' | 'full';
  random?: () => number;
  /** Injected for tests; defaults to the backend `sleep`. */
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * `retry` with jittered delays instead of a fixed exponential schedule. Same contract: the last
 * error is rethrown once attempts run out or `shouldRetry` says no. Without `shouldRetry`, every
 * error is retried.
 */
export async function retryWithJitter<T>(
  fn: (attempt: number) => Promise<T>,
  options: JitterRetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseMs = options.baseMs ?? 250;
  const maxMs = options.maxMs ?? 30_000;
  const random = options.random ?? Math.random;
  const wait = options.sleepFn ?? sleep;
  let previous: number | undefined;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= attempts || (options.shouldRetry && !options.shouldRetry(error, attempt)))
        throw error;
      previous =
        options.strategy === 'full'
          ? fullJitter(baseMs, maxMs, attempt, random)
          : decorrelatedJitter(baseMs, maxMs, previous, random);
      await wait(previous);
    }
  }
}
