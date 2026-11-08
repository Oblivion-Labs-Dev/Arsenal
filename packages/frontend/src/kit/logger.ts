/** Prefixed console logger that redacts email addresses (from AdhocPluginAndExtention `shared/logger.ts`). */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function redactEmails(s: string): string {
  return s.replace(EMAIL, '[email]');
}

export type LogSink = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
export type Logger = Record<keyof LogSink, (...args: unknown[]) => void>;

export interface LoggerOptions {
  /** String redactor applied to every string argument and Error message/stack. Default `redactEmails`. */
  redact?: (s: string) => string;
  sink?: LogSink;
}

export function createLogger(prefix: string, options: LoggerOptions = {}): Logger {
  const redact = options.redact ?? redactEmails;
  const sink = options.sink ?? console;
  const clean = (v: unknown): unknown => {
    if (typeof v === 'string') return redact(v);
    if (v instanceof Error) {
      const copy = new Error(redact(v.message));
      copy.name = v.name;
      copy.stack = v.stack === undefined ? undefined : redact(v.stack);
      return copy;
    }
    return v;
  };
  const tag = `[${prefix}]`;
  return {
    debug: (...args) => sink.debug(tag, ...args.map(clean)),
    info: (...args) => sink.info(tag, ...args.map(clean)),
    warn: (...args) => sink.warn(tag, ...args.map(clean)),
    error: (...args) => sink.error(tag, ...args.map(clean)),
  };
}
