import { describe, it, expect, vi } from 'vitest';
import { createLogger, redactEmails } from './logger.js';

const sink = () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('logger', () => {
  it('redacts emails', () => {
    expect(redactEmails('mail jane.doe+x@Example.co.uk now')).not.toContain('@');
  });

  it('prefixes and redacts strings and errors, keeping ordinary values intact', () => {
    const s = sink();
    const log = createLogger('app', { sink: s });
    const obj = { a: 1, at: '2026-11-12T08:30:00.000Z' };
    log.info('user a@b.io', obj);
    const args = s.info.mock.calls[0] ?? [];
    expect(args[0]).toBe('[app]');
    expect(args[1]).not.toContain('a@b.io');
    expect(args[2]).toEqual(obj);
    log.error(new Error('failed for a@b.io'));
    const err = s.error.mock.calls[0]?.[1] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).not.toContain('a@b.io');
    expect(err.stack ?? '').not.toContain('a@b.io');
  });

  it('redacts secrets inside nested objects without mutating them', () => {
    const s = sink();
    const token = ['ghp_', 'aB3dE5gH7jK9mN1pQ3sT5vW7yZ9'].join('');
    const payload = { req: { headers: { authorization: `Bearer ${token}` }, id: 'req_1' } };
    createLogger('app', { sink: s }).warn('call', payload, `leaked ${token}`);
    const out = JSON.stringify(s.warn.mock.calls[0]);
    expect(out).not.toContain(token);
    expect(out).toContain('req_1');
    expect(payload.req.headers.authorization).toContain(token);
  });

  it('accepts a custom redactor', () => {
    const s = sink();
    createLogger('x', { sink: s, redact: (t) => t.replace(/secret/g, '***') }).warn('a secret');
    expect(s.warn).toHaveBeenCalledWith('[x]', 'a ***');
  });
});
