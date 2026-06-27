import type { JSONValue } from "@oblivion-labs/arsenal-shared";

/** OpenRouter chat message role. */
export type ChatRole = "system" | "user" | "assistant";

/** A single chat message. */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** OpenRouter chat completion response (subset). */
export interface ChatCompletionResponse {
  id?: string;
  model?: string;
  choices: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/** Configuration for {@link OpenRouterClient}. */
export interface OpenRouterClientConfig {
  /** OpenRouter API key (must be supplied by the consuming application). */
  apiKey: string;
  /** Model identifier, e.g. `openai/gpt-4o-mini`. */
  model: string;
  /** Base URL without trailing path. Default: https://openrouter.ai */
  baseUrl?: string;
  /** Request timeout in milliseconds. Default: 30000 */
  timeoutMs?: number;
  /** HTTP-Referer header value for OpenRouter rankings. */
  appUrl?: string;
  /** X-OpenRouter-Title header value. */
  appTitle?: string;
  /** Retry attempts for transient failures. Default: 2 */
  maxRetries?: number;
  /** Custom fetch implementation (for tests). */
  fetchFn?: typeof fetch;
}

/** Options for a chat completion request. */
export interface ChatCompletionOptions {
  messages: ChatMessage[];
  /** When true, requests JSON object response format. */
  jsonMode?: boolean;
  /** Override model for this request. */
  model?: string;
  /** Override timeout for this request. */
  timeoutMs?: number;
}

/** Options for JSON chat completion with schema validation. */
export interface ChatJsonOptions<TSchema> {
  systemPrompt?: string;
  userPrompt: string;
  /** Zod-like schema with a safeParse method. */
  schema: {
    safeParse: (data: unknown) => { success: true; data: TSchema } | { success: false; error: unknown };
  };
  model?: string;
  timeoutMs?: number;
}

/** Parsed chat completion result. */
export interface ChatCompletionResult {
  content: string;
  raw: ChatCompletionResponse;
  durationMs: number;
}

/** Internal error shape for HTTP failures. */
export interface HttpError extends Error {
  status?: number;
  body?: string;
}

export type OpenRouterLogFields = Record<string, JSONValue | undefined>;
