import { describe, expect, it, vi } from 'vitest';
import {
  callProvider,
  CircuitBreaker,
  CircuitBreakerRegistry,
  classifyProviderFailure,
  ProviderError,
} from './index.js';

const httpError = (status: number, body?: unknown, headers?: Record<string, string>) =>
  Object.assign(new Error(`HTTP ${status}`), { status, body, headers });

describe('classifyProviderFailure', () => {
  it('tells a short rate limit from an exhausted quota', () => {
    const rate = classifyProviderFailure(httpError(429, 'slow down', { 'Retry-After': '7' }));
    expect(rate).toMatchObject({ kind: 'rate_limit', retryable: true, retryAfterMs: 7000 });
    expect(rate.countsTowardBreaker).toBe(false);

    const quota = classifyProviderFailure(
      httpError(429, { error: { message: 'Insufficient balance on this account' } }),
    );
    expect(quota).toMatchObject({ kind: 'quota_exhausted', retryable: false });
    expect(quota.countsTowardBreaker).toBe(true);

    expect(classifyProviderFailure(httpError(402)).kind).toBe('quota_exhausted');
    expect(classifyProviderFailure(httpError(403, 'insufficient_quota')).kind).toBe(
      'quota_exhausted',
    );
  });

  it('reads Retry-After from every place providers put it', () => {
    const ms = (e: unknown) => classifyProviderFailure(e).retryAfterMs;
    expect(ms(httpError(429, '', { 'retry-after-ms': '1500' }))).toBe(1500);
    expect(ms(httpError(429, '', { 'retry-after': '5m' }))).toBe(300_000);
    const date = new Date(Date.now() + 60_000).toUTCString();
    expect(ms(httpError(429, '', { 'retry-after': date }))).toBeGreaterThan(50_000);
    const headers = new Headers({ 'Retry-After': '3' });
    expect(ms(Object.assign(new Error('x'), { status: 429, headers }))).toBe(3000);
    const googleBody = {
      error: {
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '12s' }],
      },
    };
    expect(ms(httpError(429, googleBody))).toBe(12_000);
    expect(ms(httpError(429, 'Rate limited. Please retry in 2 seconds.'))).toBe(2000);
    expect(ms(httpError(500))).toBeNull();
  });

  it('classifies auth, model, context, bad request and server errors', () => {
    const kind = (e: unknown) => classifyProviderFailure(e).kind;
    expect(kind(httpError(401))).toBe('auth');
    expect(kind(httpError(400, 'Invalid API key provided'))).toBe('auth');
    expect(kind(httpError(403))).toBe('auth');
    expect(kind(httpError(404))).toBe('model_unavailable');
    expect(kind(httpError(400, 'The model gpt-x does not exist'))).toBe('model_unavailable');
    expect(kind(httpError(400, "This model's maximum context length is 8192 tokens"))).toBe(
      'context_limit',
    );
    expect(kind(httpError(422, 'temperature must be <= 2'))).toBe('bad_request');
    expect(kind(httpError(503))).toBe('provider_unavailable');
    expect(kind(httpError(504))).toBe('timeout');
    expect(classifyProviderFailure(httpError(400)).retryable).toBe(false);
  });

  it('classifies transport failures without a status', () => {
    const kind = (e: unknown) => classifyProviderFailure(e).kind;
    expect(kind(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' }))).toBe(
      'network',
    );
    expect(kind(new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } }))).toBe('network');
    expect(kind(new DOMException('The operation timed out.', 'TimeoutError'))).toBe('timeout');
    expect(kind(new DOMException('aborted', 'AbortError'))).toBe('cancelled');
    expect(classifyProviderFailure(new Error('weird'))).toMatchObject({
      kind: 'unknown',
      retryable: false,
    });
  });

  it('redacts secrets and bounds the message', () => {
    const key = `sk-${'a1B2c3D4'.repeat(6)}`;
    const failure = classifyProviderFailure(httpError(401, `bad key ${key}`));
    expect(failure.message).not.toContain(key);
    expect(new ProviderError(failure).message).not.toContain(key);
    expect(classifyProviderFailure(httpError(500, 'x'.repeat(5000))).message.length).toBe(500);
  });
});

describe('CircuitBreaker', () => {
  const failure = (status: number) => classifyProviderFailure(httpError(status));

  it('opens at the threshold, lets one probe through when half-open, closes on success', () => {
    let now = 0;
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      now: () => now,
    });
    breaker.recordFailure(failure(400));
    expect(breaker.snapshot.consecutiveFailures).toBe(0); // the request's fault, not the provider's
    breaker.recordFailure(failure(503));
    expect(breaker.tryAcquire()).toBe(true);
    breaker.recordFailure(failure(503));
    expect(breaker.snapshot).toMatchObject({ state: 'open', retryAt: 1000 });
    expect(breaker.tryAcquire()).toBe(false);

    now = 1000;
    expect(breaker.snapshot.state).toBe('half-open');
    expect(breaker.tryAcquire()).toBe(true);
    expect(breaker.tryAcquire()).toBe(false); // only one probe
    breaker.recordSuccess();
    expect(breaker.snapshot).toMatchObject({ state: 'closed', consecutiveFailures: 0 });
  });

  it('reopens on a failed probe and frees the probe on release', () => {
    let now = 0;
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 100,
      now: () => now,
    });
    breaker.recordFailure(failure(503));
    now = 100;
    expect(breaker.tryAcquire()).toBe(true);
    breaker.release();
    expect(breaker.tryAcquire()).toBe(true);
    breaker.recordFailure(failure(503));
    expect(breaker.snapshot).toMatchObject({ state: 'open', retryAt: 200 });
  });

  it('opens at once with the long cooldown when the quota is spent', () => {
    const breaker = new CircuitBreaker({ longCooldownMs: 3_600_000, now: () => 0 });
    breaker.recordFailure(failure(402));
    expect(breaker.snapshot).toMatchObject({ state: 'open', retryAt: 3_600_000 });
  });

  it('keeps one breaker per key', () => {
    const registry = new CircuitBreakerRegistry({ failureThreshold: 1 });
    registry.get('openai').recordFailure(failure(503));
    expect(registry.get('openai').snapshot.state).toBe('open');
    expect(registry.get('groq').snapshot.state).toBe('closed');
    expect([...registry.snapshots().keys()]).toEqual(['openai', 'groq']);
  });
});

describe('callProvider', () => {
  const record = (sleeps: number[]) => async (ms: number) => void sleeps.push(ms);

  it('retries transient failures a bounded number of times, honouring Retry-After', async () => {
    const sleeps: number[] = [];
    const onRetry = vi.fn();
    const fn = vi.fn(async (attempt: number) => {
      if (attempt === 1) throw httpError(429, '', { 'retry-after': '4' });
      if (attempt === 2) throw httpError(503);
      return 'ok';
    });
    await expect(
      callProvider(fn, { sleepFn: record(sleeps), random: () => 0, baseMs: 100, onRetry }),
    ).resolves.toBe('ok');
    expect(sleeps[0]).toBe(4000);
    expect(sleeps).toHaveLength(2);
    expect(onRetry).toHaveBeenCalledTimes(2);

    const always = vi.fn(async () => {
      throw httpError(503);
    });
    const error = await callProvider(always, { attempts: 99, sleepFn: record([]) }).catch(
      (e: unknown) => e,
    );
    expect(always).toHaveBeenCalledTimes(10); // capped even when asked for more
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ kind: 'provider_unavailable', attempts: 10 });
  });

  it('does not retry non-retryable failures or a Retry-After beyond the cap', async () => {
    const bad = vi.fn(async () => {
      throw httpError(400, 'bad input');
    });
    await expect(callProvider(bad, { sleepFn: record([]) })).rejects.toMatchObject({
      kind: 'bad_request',
      attempts: 1,
    });
    expect(bad).toHaveBeenCalledTimes(1);

    const longWait = vi.fn(async () => {
      throw httpError(429, '', { 'retry-after': '3600' });
    });
    await expect(
      callProvider(longWait, { maxRetryAfterMs: 60_000, sleepFn: record([]) }),
    ).rejects.toMatchObject({ kind: 'rate_limit', failure: { retryAfterMs: 3_600_000 } });
    expect(longWait).toHaveBeenCalledTimes(1);
  });

  it('fails fast without calling the provider while the circuit is open', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    const fn = vi.fn(async () => {
      throw httpError(503);
    });
    await expect(
      callProvider(fn, { breaker, provider: 'acme', sleepFn: record([]) }),
    ).rejects.toMatchObject({ kind: 'circuit_open', provider: 'acme' });
    expect(fn).toHaveBeenCalledTimes(1); // the open circuit refused the retry
    await expect(callProvider(fn, { breaker })).rejects.toMatchObject({
      kind: 'circuit_open',
      retryable: false,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops on abort, including mid-backoff, without tripping the breaker', async () => {
    const controller = new AbortController();
    const fn = vi.fn(async () => {
      throw httpError(503);
    });
    const pending = callProvider(fn, {
      signal: controller.signal,
      sleepFn: () => new Promise(() => {}), // never resolves on its own
      attempts: 5,
    });
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' });
    expect(fn).toHaveBeenCalledTimes(1);

    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    const aborted = new AbortController();
    aborted.abort();
    const never = vi.fn(async () => 'x');
    await expect(callProvider(never, { signal: aborted.signal, breaker })).rejects.toMatchObject({
      kind: 'cancelled',
    });
    expect(never).not.toHaveBeenCalled();
    expect(breaker.snapshot.state).toBe('closed');
  });
});
