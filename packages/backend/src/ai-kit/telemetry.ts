// A minimal OTLP/HTTP-JSON-style sink with a local JSON-lines fallback, plus a step tracer
// interface. Ported from Sutra packages/core/src/telemetry-sink.ts and tracing.ts.
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { errorMessage, logger } from '../logging/logger.js';

type Attributes = Record<string, string | number | boolean>;

export interface MetricRecord {
  name: string;
  value: number;
  timestamp?: number;
  attributes?: Attributes;
}

export interface SpanRecord {
  name: string;
  traceId: string;
  spanId: string;
  startTime: number;
  endTime: number;
  attributes?: Attributes;
}

export interface TelemetrySinkOptions {
  /** e.g. http://localhost:4318. Defaults to OTEL_EXPORTER_OTLP_ENDPOINT; unset means local only. */
  otlpEndpoint?: string;
  /** JSON-lines file used when there is no endpoint or the export fails. */
  localLogPath?: string;
  /** Bound for one export request before falling back. Default 5000. */
  otlpTimeoutMs?: number;
  /** Injected in tests; defaults to global fetch. */
  fetch?: typeof fetch;
  /** Called when an export fails (the record still goes to the local log). Default: logged. */
  onExportError?: (error: unknown, kind: 'metric' | 'span') => void;
}

export class TelemetrySink {
  readonly #endpoint: string | undefined;
  readonly #localLogPath: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;
  readonly #onExportError: (error: unknown, kind: 'metric' | 'span') => void;

  constructor(options: TelemetrySinkOptions = {}) {
    this.#endpoint = (options.otlpEndpoint ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT)?.replace(
      /\/+$/,
      '',
    );
    this.#localLogPath = options.localLogPath ?? '.arsenal/telemetry.log';
    this.#timeoutMs = options.otlpTimeoutMs ?? 5000;
    this.#fetch = options.fetch ?? fetch;
    this.#onExportError =
      options.onExportError ??
      ((error, kind) =>
        logger.error('telemetry.export_failed', { kind, error: errorMessage(error) }));
  }

  async emitMetric(metric: MetricRecord): Promise<void> {
    await this.#emit('metric', '/v1/metrics', {
      type: 'metric',
      ...metric,
      timestamp: metric.timestamp ?? Date.now(),
    });
  }

  async emitSpan(span: SpanRecord): Promise<void> {
    await this.#emit('span', '/v1/traces', { type: 'span', ...span });
  }

  async #emit(kind: 'metric' | 'span', path: string, record: object): Promise<void> {
    if (this.#endpoint) {
      try {
        const res = await this.#fetch(`${this.#endpoint}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(record),
          signal: AbortSignal.timeout(this.#timeoutMs),
        });
        if (res.ok) return;
        throw new Error(`Telemetry export answered ${res.status}`);
      } catch (error) {
        this.#onExportError(error, kind);
      }
    }
    this.#writeLocal(record);
  }

  #writeLocal(record: object): void {
    mkdirSync(dirname(this.#localLogPath), { recursive: true });
    appendFileSync(this.#localLogPath, `${JSON.stringify(record)}\n`, 'utf8');
  }
}

export type StepKind = 'deterministic' | 'ai' | 'tool';

/**
 * Records what a workflow did, step by step. `detail` must not contain secrets or prompt/source
 * content: counts, ids, model names, decisions.
 */
export interface Tracer {
  step<T>(
    name: string,
    kind: StepKind,
    fn: (note: (detail: Record<string, unknown>) => void) => Promise<T>,
  ): Promise<T>;
  /** Attaches metadata of the AI call just made (e.g. a ModelUsage) to the running step. */
  aiCall(record: Record<string, unknown>): void;
}

/** For tests and callers that do not persist traces. */
export const noopTracer: Tracer = {
  step: (_name, _kind, fn) => fn(() => {}),
  aiCall: () => {},
};
