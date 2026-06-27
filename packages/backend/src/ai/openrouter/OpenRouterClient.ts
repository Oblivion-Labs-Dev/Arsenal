import {
  DEFAULT_LLM_TIMEOUT_MS,
  DEFAULT_RETRY_ATTEMPTS,
  OPENROUTER_CHAT_COMPLETIONS_PATH,
  OPENROUTER_DEFAULT_BASE_URL,
} from "@oblivion-labs/arsenal-shared";
import { AppError } from "../../errors/AppError.js";
import {
  endpointLabel,
  errorMessage,
  isAbortError,
  Logger,
  readErrorBody,
  truncateForLog,
} from "../../logging/logger.js";
import { createTimeoutSignal, retry, safeJsonParse } from "../../utils/retry.js";
import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  ChatCompletionResult,
  ChatJsonOptions,
  HttpError,
  OpenRouterClientConfig,
} from "./types.js";

/**
 * Typed client for OpenRouter chat completions.
 * API keys and model defaults must be supplied by the consuming application.
 */
export class OpenRouterClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly appUrl?: string;
  private readonly appTitle?: string;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;
  private readonly log: Logger;

  constructor(config: OpenRouterClientConfig) {
    if (!config.apiKey?.trim()) {
      throw new AppError("OpenRouter API key is required", {
        statusCode: 400,
        code: "MISSING_API_KEY",
      });
    }
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = (config.baseUrl ?? OPENROUTER_DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;
    this.appUrl = config.appUrl;
    this.appTitle = config.appTitle;
    this.maxRetries = config.maxRetries ?? DEFAULT_RETRY_ATTEMPTS;
    this.fetchFn = config.fetchFn ?? fetch;
    this.log = new Logger({ service: "openrouter" });
  }

  /** Send a chat completion request and return the assistant message content. */
  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const model = options.model ?? this.model;
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const url = `${this.baseUrl}${OPENROUTER_CHAT_COMPLETIONS_PATH}`;

    this.log.info("openrouter_start", {
      model,
      endpoint: endpointLabel(url),
      messageCount: options.messages.length,
    });

    const startedAt = Date.now();

    const execute = async (): Promise<ChatCompletionResult> => {
      const { signal, clear } = createTimeoutSignal(timeoutMs);
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        };
        if (this.appUrl) headers["HTTP-Referer"] = this.appUrl;
        if (this.appTitle) headers["X-OpenRouter-Title"] = this.appTitle;

        const res = await this.fetchFn(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model,
            messages: options.messages,
            ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
          signal,
        });

        clear();

        if (!res.ok) {
          const body = await readErrorBody(res);
          const error = new Error(`OpenRouter HTTP ${res.status}`) as HttpError;
          error.status = res.status;
          error.body = body;
          throw error;
        }

        const raw = (await res.json()) as ChatCompletionResponse;
        const content = raw.choices?.[0]?.message?.content ?? "";

        if (!content) {
          throw new AppError("OpenRouter returned an empty response", {
            statusCode: 502,
            code: "EMPTY_RESPONSE",
            details: { model, responseId: raw.id },
          });
        }

        const durationMs = Date.now() - startedAt;
        this.log.info("openrouter_success", {
          model,
          status: res.status,
          durationMs,
          responseId: raw.id,
          contentLength: content.length,
          contentPreview: truncateForLog(content, 1200),
        });

        return { content, raw, durationMs };
      } catch (error) {
        clear();
        if (isAbortError(error)) {
          throw new AppError("OpenRouter request timed out", {
            statusCode: 504,
            code: "TIMEOUT",
            details: { model, timeoutMs },
          });
        }
        throw error;
      }
    };

    try {
      return await retry(execute, {
        attempts: this.maxRetries + 1,
        shouldRetry: (error) => {
          if (error instanceof AppError && error.code === "TIMEOUT") return false;
          const status = (error as HttpError).status;
          if (typeof status === "number" && status >= 400 && status < 500 && status !== 429) {
            return false;
          }
          return true;
        },
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.log.error("openrouter_failure", {
        model,
        durationMs,
        error: errorMessage(error),
        status: (error as HttpError).status,
        timedOut: isAbortError(error),
      });

      if (error instanceof AppError) throw error;

      const status = (error as HttpError).status;
      throw new AppError(errorMessage(error), {
        statusCode: typeof status === "number" ? status : 502,
        code: typeof status === "number" ? `HTTP_${status}` : "OPENROUTER_ERROR",
        details: { body: (error as HttpError).body },
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Request a JSON response and validate it against a Zod-like schema.
   * Throws {@link AppError} when parsing or validation fails.
   */
  async chatJson<T>(options: ChatJsonOptions<T>): Promise<T> {
    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: "system" as const, content: options.systemPrompt });
    }
    messages.push({ role: "user" as const, content: options.userPrompt });

    const result = await this.chat({
      messages,
      jsonMode: true,
      model: options.model,
      timeoutMs: options.timeoutMs,
    });

    const parsed = safeJsonParse(result.content);
    if (parsed === null) {
      throw new AppError("Failed to parse JSON from OpenRouter response", {
        statusCode: 502,
        code: "INVALID_JSON",
        details: { contentPreview: truncateForLog(result.content, 500) },
      });
    }

    const validated = options.schema.safeParse(parsed);
    if (!validated.success) {
      throw new AppError("OpenRouter JSON response failed schema validation", {
        statusCode: 502,
        code: "SCHEMA_VALIDATION_FAILED",
        details: { error: String(validated.error) },
      });
    }

    return validated.data;
  }
}

export type {
  OpenRouterClientConfig,
  ChatCompletionOptions,
  ChatJsonOptions,
  ChatCompletionResult,
  ChatCompletionResponse,
  ChatMessage,
} from "./types.js";
