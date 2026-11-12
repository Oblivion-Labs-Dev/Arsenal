/** Prefixed console logger that redacts secrets and email addresses (from AdhocPluginAndExtention `shared/logger.ts`). */

import { createRedactor } from '@oblivion-labs-dev/arsenal-shared/redact';

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function redactEmails(s: string): string {
  return s.replace(EMAIL, '[email]');
}

export type LogSink = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;
export type Logger = Record<keyof LogSink, (...args: unknown[]) => void>;

export interface LoggerOptions {
  /**
   * String redactor applied to every string argument and Error message/stack. By default the
   * shared redactor (secrets plus emails) runs over strings, Errors and nested object values.
   */
  redact?: (s: string) => string;
  sink?: LogSink;
}

const defaultRedactor = createRedactor({ pii: { email: true } });

export function createLogger(prefix: string, options: LoggerOptions = {}): Logger {
  const sink = options.sink ?? console;
  const custom = options.redact;
  const clean = (v: unknown): unknown => {
    if (!custom) return defaultRedactor.value(v);
    if (typeof v === 'string') return custom(v);
    if (v instanceof Error) {
      const copy = new Error(custom(v.message));
      copy.name = v.name;
      copy.stack = v.stack === undefined ? undefined : custom(v.stack);
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
