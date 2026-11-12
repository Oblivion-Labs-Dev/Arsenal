// Provider resilience: classify failures, honour Retry-After, back off with jitter, break circuits.
export {
  classifyProviderFailure,
  ProviderError,
  type ProviderFailure,
  type ProviderFailureKind,
} from './provider-failure.js';
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  type CircuitBreakerOptions,
  type CircuitSnapshot,
  type CircuitState,
} from './circuit-breaker.js';
export { callProvider, type CallProviderOptions } from './call-provider.js';
// Lower-level OmniRoute helpers (MIT, see ./omniroute/LICENSE).
export {
  classify429,
  classify429FromError,
  looksLikeQuotaExhausted,
  parseRetryAfter,
  retryAfterFromResponse,
} from './omniroute/classify429.js';
export { isModelScoped400 } from './omniroute/modelAccessDenied.js';
export { parseDelayString, parseRetryHintFromJsonBody } from './omniroute/retryAfterJson.js';
