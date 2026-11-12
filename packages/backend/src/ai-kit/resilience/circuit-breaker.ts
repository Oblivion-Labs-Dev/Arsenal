// Circuit breaker for provider calls, ported from Sutra `modules/viveka/src/circuit-breaker.ts`
// (same owner) and generalised: it reads `ProviderFailure` instead of Sutra's routing table, picks
// the cooldown from the failure (a spent quota or a rejected key opens at once and stays open for
// the provider's own reset window), takes an injectable clock, and lets only one probe through
// while half-open instead of every caller.

import type { ProviderFailure } from './provider-failure.js';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Consecutive breaking failures before the circuit opens. Default 3. */
  failureThreshold?: number;
  /** How long the circuit stays open before a probe is allowed (ms). Default 60 000. */
  resetTimeoutMs?: number;
  /** Cooldown after an exhausted quota or rejected credentials (ms). Default 3 600 000. */
  longCooldownMs?: number;
  /** Successful probes needed to close a half-open circuit. Default 1. */
  halfOpenSuccesses?: number;
  /** Clock, injected for tests. */
  now?: () => number;
}

export interface CircuitSnapshot {
  state: CircuitState;
  consecutiveFailures: number;
  /** When an open circuit will let a probe through (ms epoch), or null. */
  retryAt: number | null;
  /** The failure that opened the circuit, or null. */
  lastFailure: ProviderFailure | null;
}

/** Failures that will not clear on a short timer: open immediately, cool down for long. */
const IMMEDIATE = new Set(['quota_exhausted', 'auth']);

export class CircuitBreaker {
  readonly #threshold: number;
  readonly #resetMs: number;
  readonly #longMs: number;
  readonly #halfOpenSuccesses: number;
  readonly #now: () => number;
  #state: CircuitState = 'closed';
  #failures = 0;
  #successes = 0;
  #retryAt: number | null = null;
  #lastFailure: ProviderFailure | null = null;
  #probeInFlight = false;

  constructor(options: CircuitBreakerOptions = {}) {
    this.#threshold = Math.max(1, options.failureThreshold ?? 3);
    this.#resetMs = options.resetTimeoutMs ?? 60_000;
    this.#longMs = options.longCooldownMs ?? 3_600_000;
    this.#halfOpenSuccesses = Math.max(1, options.halfOpenSuccesses ?? 1);
    this.#now = options.now ?? Date.now;
  }

  get snapshot(): CircuitSnapshot {
    this.#tick();
    return {
      state: this.#state,
      consecutiveFailures: this.#failures,
      retryAt: this.#state === 'open' ? this.#retryAt : null,
      lastFailure: this.#lastFailure,
    };
  }

  /**
   * Asks to send one request. True means go ahead; the caller must then report the outcome with
   * `recordSuccess`, `recordFailure` or `release`, or a half-open circuit stays blocked.
   */
  tryAcquire(): boolean {
    this.#tick();
    if (this.#state === 'closed') return true;
    if (this.#state === 'open' || this.#probeInFlight) return false;
    this.#probeInFlight = true;
    return true;
  }

  recordSuccess(): void {
    this.#probeInFlight = false;
    if (this.#state === 'half-open' && ++this.#successes < this.#halfOpenSuccesses) return;
    // A served request is direct evidence the provider works, even from an open circuit.
    this.#close();
  }

  recordFailure(failure: ProviderFailure): void {
    this.#probeInFlight = false;
    if (!failure.countsTowardBreaker) return; // this request was the problem, not the provider
    this.#failures += 1;
    this.#lastFailure = failure;
    const immediate = IMMEDIATE.has(failure.kind);
    if (this.#state === 'half-open' || immediate || this.#failures >= this.#threshold) {
      const base = immediate ? this.#longMs : this.#resetMs;
      this.#open(Math.max(base, failure.retryAfterMs ?? 0));
    }
  }

  /** Ends a call that told us nothing about the provider (cancelled by the caller). */
  release(): void {
    this.#probeInFlight = false;
  }

  forceOpen(cooldownMs = this.#resetMs): void {
    this.#open(cooldownMs);
  }

  forceClose(): void {
    this.#close();
  }

  #open(cooldownMs: number) {
    this.#state = 'open';
    this.#successes = 0;
    this.#retryAt = this.#now() + cooldownMs;
  }

  #close() {
    this.#state = 'closed';
    this.#failures = 0;
    this.#successes = 0;
    this.#retryAt = null;
    this.#lastFailure = null;
  }

  #tick() {
    if (this.#state === 'open' && this.#retryAt !== null && this.#now() >= this.#retryAt) {
      this.#state = 'half-open';
      this.#successes = 0;
    }
  }
}

/** One breaker per provider, account or pool key, created on first use with shared options. */
export class CircuitBreakerRegistry {
  readonly #breakers = new Map<string, CircuitBreaker>();
  readonly #options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions = {}) {
    this.#options = options;
  }

  get(key: string): CircuitBreaker {
    let breaker = this.#breakers.get(key);
    if (!breaker) {
      breaker = new CircuitBreaker(this.#options);
      this.#breakers.set(key, breaker);
    }
    return breaker;
  }

  snapshots(): Map<string, CircuitSnapshot> {
    return new Map([...this.#breakers].map(([key, b]) => [key, b.snapshot]));
  }
}
