// Provider-agnostic failure classification for model API calls. It merges two sources (same
// owner, Sutra `modules/viveka`): the status-and-body table of `capacity.ts#classifyFailure`, and
// the OmniRoute helpers vendored under ./omniroute (MIT, see ./omniroute/LICENSE) that tell a
// short rate limit from an exhausted quota and read Retry-After from headers and JSON bodies.
// Nothing here calls a provider or retries; it only says what a failure means.

import { redactText } from '@oblivion-labs-dev/arsenal-shared/redact';
import { classify429, parseRetryAfter } from './omniroute/classify429.js';
import { isModelScoped400 } from './omniroute/modelAccessDenied.js';
import { parseRetryHintFromJsonBody } from './omniroute/retryAfterJson.js';

export type ProviderFailureKind =
  /** Short throttle (429); clears after Retry-After. */
  | 'rate_limit'
  /** Credits, billing or a long-period quota ran out; retrying soon cannot help. */
  | 'quota_exhausted'
  /** Missing or rejected credentials. */
  | 'auth'
  /** The model is unknown, withdrawn or not on this account. */
  | 'model_unavailable'
  /** The request is too large for the model's context window. */
  | 'context_limit'
  /** Any other request the provider rejected as invalid (4xx). */
  | 'bad_request'
  /** The provider or a gateway in front of it is failing (5xx). */
  | 'provider_unavailable'
  | 'timeout'
  /** The connection failed before a response (DNS, reset, refused). */
  | 'network'
  /** The caller aborted. */
  | 'cancelled'
  /** A circuit breaker refused the call without contacting the provider. */
  | 'circuit_open'
  | 'unknown';

export interface ProviderFailure {
  kind: ProviderFailureKind;
  /** HTTP status, or null when the failure happened before a response. */
  status: number | null;
  /** True when the same request may succeed if sent again later. */
  retryable: boolean;
  /** How long the provider asked us to wait, or null when it did not say. */
  retryAfterMs: number | null;
  /** True when the failure says the provider (not this one request) is unhealthy. */
  countsTowardBreaker: boolean;
  /** Redacted, single-line description safe to log or show. */
  message: string;
}

const RETRYABLE = new Set<ProviderFailureKind>([
  'rate_limit',
  'provider_unavailable',
  'timeout',
  'network',
]);
const BREAKING = new Set<ProviderFailureKind>([
  'quota_exhausted',
  'auth',
  'provider_unavailable',
  'timeout',
  'network',
]);

/** Body resets ("resets_at") can legitimately be days away; anything longer is not believed. */
const MAX_BODY_HINT_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MESSAGE = 500;

interface ErrorShape {
  status: number | null;
  headers: (name: string) => string | undefined;
  text: string;
  name: string;
  code: string;
}

function headerReader(raw: unknown): (name: string) => string | undefined {
  if (raw === null || typeof raw !== 'object') return () => undefined;
  const get = (raw as { get?: unknown }).get;
  if (typeof get === 'function') {
    return (name) => (get as (n: string) => string | null).call(raw, name) ?? undefined;
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  return (name) => {
    const hit = entries.find(([k]) => k.toLowerCase() === name.toLowerCase());
    return hit && typeof hit[1] === 'string' ? hit[1] : undefined;
  };
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

/** Reads fetch-wrapper, OpenAI-SDK and axios-style errors without depending on any of them. */
function shapeOf(error: unknown): ErrorShape {
  if (error === null || typeof error !== 'object') {
    return { status: null, headers: () => undefined, text: toText(error), name: '', code: '' };
  }
  const e = error as Record<string, unknown>;
  const response =
    e.response && typeof e.response === 'object' ? (e.response as Record<string, unknown>) : {};
  const status = [e.status, e.statusCode, response.status].find(
    (s): s is number => typeof s === 'number',
  );
  const body = response.data ?? response.body ?? e.body ?? e.error;
  const message = typeof e.message === 'string' ? e.message : '';
  const bodyText = toText(body);
  const cause = e.cause && typeof e.cause === 'object' ? (e.cause as Record<string, unknown>) : {};
  return {
    status: status ?? null,
    headers: headerReader(e.headers ?? response.headers),
    text:
      bodyText && !message.includes(bodyText)
        ? `${message} ${bodyText}`.trim()
        : message || bodyText,
    name: typeof e.name === 'string' ? e.name : '',
    code: String(e.code ?? cause.code ?? ''),
  };
}

/** Retry hint in ms from `retry-after-ms`, `Retry-After` (seconds, date, "5m"), or the body. */
function retryAfterMsOf(shape: ErrorShape): number | null {
  const ms = Number(shape.headers('retry-after-ms'));
  if (shape.headers('retry-after-ms') !== undefined && Number.isFinite(ms) && ms >= 0) return ms;
  const seconds = parseRetryAfter(shape.headers('retry-after'));
  if (seconds !== null) return seconds * 1000;
  const jsonStart = shape.text.indexOf('{');
  if (jsonStart >= 0) {
    const fromBody = parseRetryHintFromJsonBody(shape.text.slice(jsonStart), MAX_BODY_HINT_MS);
    if (fromBody !== null) return fromBody;
  }
  const phrase = /(?:please )?retry (?:in|after) (\d+(?:\.\d+)?)\s*(ms|s|seconds?)\b/i.exec(
    shape.text,
  );
  if (phrase) return Number(phrase[1]) * (phrase[2]!.toLowerCase() === 'ms' ? 1 : 1000);
  return null;
}

const has = (text: string, ...needles: string[]) => needles.some((n) => text.includes(n));

function kindOf(shape: ErrorShape): ProviderFailureKind {
  const text = shape.text.toLowerCase();
  const { status, name, code } = shape;

  if (name === 'AbortError' && !text.includes('timed out')) return 'cancelled';
  if (
    name === 'TimeoutError' ||
    name === 'StreamStalledError' ||
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'UND_ERR_HEADERS_TIMEOUT' ||
    (name === 'AbortError' && text.includes('timed out'))
  ) {
    return 'timeout';
  }
  if (status === null) {
    if (
      /^(?:ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EPIPE|UND_ERR_SOCKET)$/.test(code) ||
      (name === 'TypeError' && has(text, 'fetch failed', 'network'))
    ) {
      return 'network';
    }
    return 'unknown';
  }

  // Specific causes in the body win over the status: providers report quota as 403, context
  // overflow as 400 and withdrawn models as 400/403.
  if (classify429({ status, body: shape.text }) === 'quota_exhausted') return 'quota_exhausted';
  if (status === 402) return 'quota_exhausted';
  if (
    status !== 429 &&
    has(text, 'insufficient_quota', 'quota exceeded', 'usage limit exceeded', 'billing_hard_limit')
  ) {
    return 'quota_exhausted';
  }
  if (status === 429) return 'rate_limit';
  if (status === 401 || has(text, 'invalid api key', 'invalid_api_key', 'no auth credentials')) {
    return 'auth';
  }
  if (
    has(
      text,
      'context length',
      'context_length_exceeded',
      'maximum context',
      'too many tokens',
      'prompt is too long',
    )
  ) {
    return 'context_limit';
  }
  if (
    status === 404 ||
    (status < 500 &&
      (isModelScoped400(shape.text) || has(text, 'no endpoints found', 'model_not_found')))
  ) {
    return 'model_unavailable';
  }
  if (status === 403) return 'auth';
  if (status === 408 || status === 504) return 'timeout';
  if (status >= 500) return 'provider_unavailable';
  if (status >= 400) return 'bad_request';
  return 'unknown';
}

function messageOf(shape: ErrorShape, kind: ProviderFailureKind): string {
  const base = shape.text.replace(/\s+/g, ' ').trim() || kind.replace('_', ' ');
  const redacted = redactText(base);
  return redacted.length > MAX_MESSAGE ? `${redacted.slice(0, MAX_MESSAGE - 1)}…` : redacted;
}

/**
 * Classifies anything a provider call can throw. Unknown failures are not retried: a retry is
 * billed again, so only failures known to be transient are marked retryable.
 */
export function classifyProviderFailure(error: unknown): ProviderFailure {
  if (error instanceof ProviderError) return error.failure;
  const shape = shapeOf(error);
  const kind = kindOf(shape);
  return {
    kind,
    status: shape.status,
    retryable: RETRYABLE.has(kind),
    retryAfterMs: retryAfterMsOf(shape),
    countsTowardBreaker: BREAKING.has(kind),
    message: messageOf(shape, kind),
  };
}

/** A classified provider failure. The original error is kept as `cause` (unredacted, not logged). */
export class ProviderError extends Error {
  readonly failure: ProviderFailure;
  /** Which provider or pool failed, when the caller said. */
  readonly provider: string | null;
  /** Attempts made before giving up (1 when no retry happened). */
  readonly attempts: number;

  constructor(
    failure: ProviderFailure,
    options: { provider?: string; attempts?: number; cause?: unknown } = {},
  ) {
    super(`${failure.kind}${failure.status ? ` (${failure.status})` : ''}: ${failure.message}`, {
      cause: options.cause,
    });
    this.name = 'ProviderError';
    this.failure = failure;
    this.provider = options.provider ?? null;
    this.attempts = options.attempts ?? 1;
  }

  get kind(): ProviderFailureKind {
    return this.failure.kind;
  }
  get retryable(): boolean {
    return this.failure.retryable;
  }
}
