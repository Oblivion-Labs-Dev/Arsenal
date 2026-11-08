// One adapter for every OpenAI-compatible chat-completions API (OpenAI, Groq, OpenRouter,
// DeepSeek, local servers). Ported from Kaka packages/ai/src/llm/openAiCompatible.ts.
import OpenAI from 'openai';
import { errorMessage, logger } from '../logging/logger.js';
import { buildMessages } from './prompt.js';
import { toStrictJsonSchema } from './strict-schema.js';
import type {
  LlmProvider,
  ModelTier,
  ModelUsage,
  StructuredRequest,
  TextStreamRequest,
  UsageSink,
} from './types.js';

/** A structured call (document extraction) may run this long before it is abandoned. */
const STRUCTURED_TIMEOUT_MS = 180_000;
/** No first word within this long means the provider is stuck, not thinking. */
export const FIRST_TOKEN_DEADLINE_MS = 25_000;
/** Once words are flowing, this long a gap means the stream has stalled. */
export const STREAM_IDLE_MS = 15_000;

/** A stream that went quiet and was abandoned; the caller can offer a retry. */
export class StreamStalledError extends Error {
  constructor() {
    super('STREAM_STALLED: the language model stopped responding.');
    this.name = 'StreamStalledError';
  }
}

/** The model returned JSON that does not match the schema, twice. */
export class LlmOutputError extends Error {
  constructor(
    readonly operation: string,
    readonly issues: string[],
  ) {
    super(`The model's answer for ${operation} did not match the expected shape.`);
    this.name = 'LlmOutputError';
  }
}

export interface OpenAiCompatibleOptions {
  /** Recorded with usage, e.g. "openai", "groq", "openrouter". */
  name: string;
  apiKey: string;
  /** e.g. https://api.groq.com/openai/v1. Undefined uses the SDK default (OpenAI). */
  baseURL?: string;
  models: Record<ModelTier, string>;
  onUsage?: UsageSink;
  /** Called when `onUsage` throws. Default: logged as an error. Never fails the request. */
  onUsageError?: (error: unknown, usage: ModelUsage) => void;
  /** Injected in tests; defaults to global fetch. */
  fetch?: typeof fetch;
  /** A ready-made client (custom transports). Overrides apiKey/baseURL/fetch. */
  client?: OpenAI;
  timeoutMs?: number;
  /** Output budget for structured answers. Providers default low (Groq: 1024). Default 16384. */
  maxOutputTokens?: number;
  /** Provider-specific request fields, e.g. Groq's `include_reasoning`. */
  extraBody?: Record<string, unknown>;
  /**
   * False for providers that only offer JSON mode (DeepSeek): every structured call then uses
   * `json_object` with the schema written into the instructions.
   */
  jsonSchemaOutput?: boolean;
  /** The request field for the output budget; DeepSeek documents `max_tokens`. */
  tokenLimitField?: 'max_completion_tokens' | 'max_tokens';
  /** Stream watchdog deadlines (defaults FIRST_TOKEN_DEADLINE_MS / STREAM_IDLE_MS). */
  firstTokenDeadlineMs?: number;
  streamIdleMs?: number;
}

/**
 * Retries are bounded on both axes: the SDK retries transient HTTP failures (429, 5xx) at most
 * twice with backoff, and an answer that fails schema validation is asked for once more, then
 * reported as `LlmOutputError`. Nothing loops.
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: string;
  readonly #client: OpenAI;
  readonly #options: OpenAiCompatibleOptions;

  constructor(options: OpenAiCompatibleOptions) {
    this.name = options.name;
    this.#options = options;
    this.#client =
      options.client ??
      new OpenAI({
        apiKey: options.apiKey,
        ...(options.baseURL ? { baseURL: options.baseURL } : {}),
        maxRetries: 2,
        timeout: options.timeoutMs ?? 60_000,
        ...(options.fetch ? { fetch: options.fetch } : {}),
      });
  }

  /**
   * Two attempts. The first uses strict structured output. If the provider rejects its own
   * generation as invalid JSON (Groq answers 400 json_validate_failed), or the result fails the
   * schema, the second asks for plain JSON with the schema written into the instructions. Either
   * way the answer is validated against the same zod schema before anything is returned.
   */
  async generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
    const model = this.#options.models[request.tier];
    const jsonSchema = toStrictJsonSchema(request.schema);
    let lastIssues: string[] = [];

    for (let attempt = 1; attempt <= 2; attempt++) {
      const strict = attempt === 1 && this.#options.jsonSchemaOutput !== false;
      const started = Date.now();
      let inputTokens = 0;
      let outputTokens = 0;
      let ok = false;
      try {
        const instructions = strict
          ? request.instructions
          : `${request.instructions}\n\nReply with one JSON object only, matching this JSON Schema exactly:\n${JSON.stringify(jsonSchema)}`;
        const completion = await this.#client.chat.completions.create(
          {
            model,
            messages: buildMessages(instructions, request.data),
            ...this.#tokenLimit(request.maxOutputTokens ?? this.#options.maxOutputTokens ?? 16_384),
            ...(this.#options.extraBody ?? {}),
            response_format: strict
              ? {
                  type: 'json_schema',
                  json_schema: { name: request.schemaName, strict: true, schema: jsonSchema },
                }
              : { type: 'json_object' },
          },
          // Retry a timed-out call at most once: every retry is billed again.
          {
            ...(request.signal ? { signal: request.signal } : {}),
            timeout: STRUCTURED_TIMEOUT_MS,
            maxRetries: 1,
          },
        );
        inputTokens = completion.usage?.prompt_tokens ?? 0;
        outputTokens = completion.usage?.completion_tokens ?? 0;

        const choice = completion.choices[0];
        const parsed = request.schema.safeParse(
          parseJsonOrUndefined(choice?.message.content ?? ''),
        );
        if (parsed.success) {
          ok = true;
          return parsed.data;
        }
        lastIssues =
          choice?.finish_reason === 'length'
            ? ['the answer was cut off at the output limit']
            : parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
      } catch (error) {
        if (!isInvalidGeneration(error)) throw error;
        lastIssues = [error instanceof Error ? error.message : String(error)];
      } finally {
        await this.#record(request, model, {
          inputTokens,
          outputTokens,
          latencyMs: Date.now() - started,
          firstTokenMs: null,
          ok,
        });
      }
    }
    throw new LlmOutputError(request.operation, lastIssues);
  }

  async *streamText(request: TextStreamRequest): AsyncIterable<string> {
    const model = this.#options.models[request.tier];
    const started = Date.now();
    let firstTokenMs: number | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    let ok = false;
    // A watchdog for streams that go quiet: the SDK's timeout ends once headers arrive, and a
    // provider can then stall forever (some keep the line open with comments).
    const watchdog = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => watchdog.abort(), ms);
    };
    const signal = request.signal
      ? AbortSignal.any([request.signal, watchdog.signal])
      : watchdog.signal;
    const stalled = () => watchdog.signal.aborted && !request.signal?.aborted;
    arm(this.#options.firstTokenDeadlineMs ?? FIRST_TOKEN_DEADLINE_MS);
    try {
      const stream = await this.#client.chat.completions.create(
        {
          model,
          messages: buildMessages(request.instructions, request.data),
          // Live answers are short; the budget only covers low-effort reasoning plus the answer.
          ...this.#tokenLimit(2048),
          ...(this.#options.extraBody ?? {}),
          stream: true,
          stream_options: { include_usage: true },
        },
        { signal },
      );
      for await (const chunk of stream) {
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
        const delta = chunk.choices[0]?.delta.content;
        if (delta) firstTokenMs ??= Date.now() - started;
        // Keep-alive chunks before the first word don't extend the first-word deadline.
        if (firstTokenMs !== null) arm(this.#options.streamIdleMs ?? STREAM_IDLE_MS);
        if (delta) yield delta;
      }
      // The SDK can end an aborted stream quietly rather than throwing.
      if (stalled()) throw new StreamStalledError();
      ok = true;
    } catch (error) {
      if (error instanceof StreamStalledError) throw error;
      if (stalled()) throw new StreamStalledError();
      throw error;
    } finally {
      clearTimeout(timer);
      await this.#record(request, model, {
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - started,
        firstTokenMs,
        ok,
      });
    }
  }

  #tokenLimit(tokens: number): { max_completion_tokens: number } | { max_tokens: number } {
    return this.#options.tokenLimitField === 'max_tokens'
      ? { max_tokens: tokens }
      : { max_completion_tokens: tokens };
  }

  async #record(
    request: { operation: string; promptVersion: string },
    model: string,
    measured: Pick<
      ModelUsage,
      'inputTokens' | 'outputTokens' | 'latencyMs' | 'firstTokenMs' | 'ok'
    >,
  ): Promise<void> {
    if (!this.#options.onUsage) return;
    const usage: ModelUsage = {
      provider: this.name,
      model,
      operation: request.operation,
      promptVersion: request.promptVersion,
      ...measured,
    };
    try {
      await this.#options.onUsage(usage);
    } catch (error) {
      // Losing a usage row must not fail the user's request, but it is never silent.
      if (this.#options.onUsageError) this.#options.onUsageError(error, usage);
      else
        logger.error('ai.usage_record_failed', {
          provider: usage.provider,
          operation: usage.operation,
          error: errorMessage(error),
        });
    }
  }
}

/** The provider generated output it could not validate itself (e.g. Groq json_validate_failed). */
export function isInvalidGeneration(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError) || error.status !== 400) return false;
  return /json_validate_failed|failed to (validate|generate) json|failed_generation/i.test(
    `${error.message} ${JSON.stringify(error.error ?? '')}`,
  );
}

function parseJsonOrUndefined(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Unparseable output is reported by the schema check as a shape mismatch, not swallowed.
    return undefined;
  }
}
