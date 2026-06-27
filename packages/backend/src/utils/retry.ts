import type { JSONValue } from "@oblivion-labs-dev/arsenal-shared";
import { TRANSIENT_HTTP_STATUS_CODES } from "@oblivion-labs-dev/arsenal-shared";

/**
 * Parse JSON from LLM output, stripping markdown fences and extracting embedded objects.
 * Returns null when parsing fails.
 */
export function safeJsonParse(text: string): JSONValue | null {
  try {
    let clean = text.trim();
    if (clean.startsWith("```")) {
      const match = clean.match(/^(?:```[a-zA-Z]*\n?)([\s\S]*?)(?:\n?```)$/);
      if (match?.[1]) {
        clean = match[1].trim();
      }
    }
    return JSON.parse(clean) as JSONValue;
  } catch {
    try {
      const startIdx = text.indexOf("{");
      const endIdx = text.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1) {
        const sliced = text.slice(startIdx, endIdx + 1);
        return JSON.parse(sliced) as JSONValue;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  attempts?: number;
  /** Initial delay in ms before first retry. Default: 250 */
  delayMs?: number;
  /** Multiplier for exponential backoff. Default: 2 */
  backoffFactor?: number;
  /** Optional predicate to decide if an error is retryable. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

const defaultShouldRetry = (error: unknown): boolean => {
  if (error && typeof error === "object") {
    const status = (error as { status?: number }).status;
    if (typeof status === "number" && TRANSIENT_HTTP_STATUS_CODES.includes(status as (typeof TRANSIENT_HTTP_STATUS_CODES)[number])) {
      return true;
    }
    if ((error as { name?: string }).name === "AbortError") return false;
  }
  if (error instanceof TypeError) return true;
  return false;
};

/** Sleep for the given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff.
 * Throws the last error when all attempts are exhausted.
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delayMs = options.delayMs ?? 250;
  const backoffFactor = options.backoffFactor ?? 2;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error, attempt)) {
        throw error;
      }
      await sleep(delayMs * Math.pow(backoffFactor, attempt - 1));
    }
  }
  throw lastError;
}

export interface TimeoutOptions {
  /** Timeout in milliseconds. */
  ms: number;
  /** Optional message for timeout errors. */
  message?: string;
}

/**
 * Run a promise with a timeout. Rejects with an AbortError-like error on timeout.
 */
export function withTimeout<T>(promise: Promise<T>, options: TimeoutOptions): Promise<T> {
  const { ms, message = `Operation timed out after ${ms}ms` } = options;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error(message);
      error.name = "AbortError";
      reject(error);
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/** Create an AbortSignal that aborts after the given timeout. */
export function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  };
}
