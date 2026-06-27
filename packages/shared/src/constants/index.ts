/** Default OpenRouter chat completions path (relative to base URL). */
export const OPENROUTER_CHAT_COMPLETIONS_PATH = "/api/v1/chat/completions";

/** Default OpenRouter API base URL. */
export const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai";

/** Default request timeout for LLM calls (ms). */
export const DEFAULT_LLM_TIMEOUT_MS = 30_000;

/** Default retry count for transient HTTP failures. */
export const DEFAULT_RETRY_ATTEMPTS = 2;

/** HTTP status codes considered transient for retry. */
export const TRANSIENT_HTTP_STATUS_CODES = [408, 429, 500, 502, 503, 504] as const;
