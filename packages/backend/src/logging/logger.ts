import type { JSONValue } from "@oblivion-labs/arsenal-shared";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [key: string]: JSONValue | undefined;
}

export interface LoggerOptions {
  service?: string;
  /** Custom log sink (defaults to console.log). */
  sink?: (line: string) => void;
}

/**
 * Minimal structured JSON logger for server-side services.
 * Emits one JSON object per line for CloudWatch / log aggregators.
 */
export class Logger {
  private readonly service: string;
  private readonly sink: (line: string) => void;

  constructor(options: LoggerOptions = {}) {
    this.service = options.service ?? "app";
    this.sink = options.sink ?? ((line) => console.log(line));
  }

  /** Log at info level. */
  info(event: string, fields: LogFields = {}): void {
    this.write("info", event, fields);
  }

  /** Log at warn level. */
  warn(event: string, fields: LogFields = {}): void {
    this.write("warn", event, fields);
  }

  /** Log at error level. */
  error(event: string, fields: LogFields = {}): void {
    this.write("error", event, fields);
  }

  /** Log at debug level. */
  debug(event: string, fields: LogFields = {}): void {
    this.write("debug", event, fields);
  }

  /** Create a child logger with additional default fields. */
  child(defaultFields: LogFields): Logger {
    const parent = this;
    return {
      info: (event, fields) => parent.info(event, { ...defaultFields, ...fields }),
      warn: (event, fields) => parent.warn(event, { ...defaultFields, ...fields }),
      error: (event, fields) => parent.error(event, { ...defaultFields, ...fields }),
      debug: (event, fields) => parent.debug(event, { ...defaultFields, ...fields }),
      child: (more) => parent.child({ ...defaultFields, ...more }),
    } as Logger;
  }

  private write(level: LogLevel, event: string, fields: LogFields): void {
    const payload: Record<string, JSONValue> = {
      level,
      event,
      service: this.service,
      ts: new Date().toISOString(),
    };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) payload[key] = value;
    }
    this.sink(JSON.stringify(payload));
  }
}

/** Default application logger instance. */
export const logger = new Logger();

/** Truncate a string for safe log previews. */
export function truncateForLog(str: string, max = 400): string {
  if (!str) return "";
  const oneLine = str.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

/** Return a short endpoint label for logging. */
export function endpointLabel(url: string): string {
  return url.includes("openrouter.ai") ? "openrouter" : "custom";
}

/** Detect fetch abort / timeout errors. */
export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return (err as { name?: string }).name === "AbortError";
}

/** Normalize unknown errors to a message string. */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Read and truncate an HTTP error response body. */
export async function readErrorBody(res: Response, max = 400): Promise<string> {
  try {
    return truncateForLog(await res.text(), max);
  } catch {
    return "";
  }
}
