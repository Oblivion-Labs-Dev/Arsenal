import { describe, it, expect, vi } from 'vitest';
import { createLogger, redactEmails } from './logger.js';

const sink = () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('logger', () => {
  it('redacts emails', () => {
    expect(redactEmails('mail jane.doe+x@Example.co.uk now')).not.toContain('@');
  });

  it('prefixes and redacts strings and errors, leaving other values alone', () => {
    const s = sink();
    const log = createLogger('app', { sink: s });
    const obj = { a: 1 };
    log.info('user a@b.io', obj);
    const args = s.info.mock.calls[0] ?? [];
    expect(args[0]).toBe('[app]');
    expect(args[1]).not.toContain('a@b.io');
    expect(args[2]).toBe(obj);
    log.error(new Error('failed for a@b.io'));
    const err = s.error.mock.calls[0]?.[1] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).not.toContain('a@b.io');
    expect(err.stack ?? '').not.toContain('a@b.io');
  });

  it('accepts a custom redactor', () => {
    const s = sink();
    createLogger('x', { sink: s, redact: (t) => t.replace(/secret/g, '***') }).warn('a secret');
    expect(s.warn).toHaveBeenCalledWith('[x]', 'a ***');
  });
});
