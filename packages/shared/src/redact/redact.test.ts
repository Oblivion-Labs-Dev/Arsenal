import { describe, expect, it } from 'vitest';
import { createRedactor, isSensitiveKey, redactText, redactValue } from './index.js';

// Fixture secrets are assembled at runtime so secret scanners do not flag this file.
const j = (...parts: string[]) => parts.join('');
const OPENAI = j('sk-', 'proj-', 'A1b2C3d4E5f6G7h8I9j0K1l2');
const GITHUB = j('ghp_', 'aB3dE5gH7jK9mN1pQ3sT5vW7yZ9');
const AWS = j('AKIA', 'IOSFODNN7EXAMPLE');
const STRIPE = j('sk_', 'live_', '4eC39HqLyjWDarjtT1zdp7dc');
const JWT = j(
  'eyJhbGciOiJIUzI1NiJ9',
  '.',
  'eyJzdWIiOiIxMjM0NTY3ODkwIn0',
  '.',
  'dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
);
const RANDOM = j('Zx9Qm2Lp7Vr4', 'Tk8Wn3Hs6Jd1', 'Fy5Gb0Ca');

describe('redactText: false negatives (secrets must go)', () => {
  it.each([
    ['openai key', `using ${OPENAI} now`, OPENAI],
    ['github token', `GH=${GITHUB}`, GITHUB],
    ['aws key id', `id ${AWS}`, AWS],
    ['stripe live key', `stripe ${STRIPE}`, STRIPE],
    ['jwt', `cookie ${JWT}`, JWT],
    ['bearer header', 'Authorization: Bearer abcDEF123456ghiJKL', 'abcDEF123456ghiJKL'],
    ['basic auth', 'Authorization: Basic dXNlcjpwYXNzd29yZA==', 'dXNlcjpwYXNzd29yZA'],
    ['url credentials', 'postgres://admin:hunter22@db.local/x', 'hunter22'],
    ['env assignment', 'OPENAI_API_KEY=abc123def456', 'abc123def456'],
    ['json field', '{"accessToken": "tok-value-123"}', 'tok-value-123'],
    ['yaml field', 'client_secret: s3cr3t-value', 's3cr3t-value'],
    ['short password', 'password=abc', '=abc'],
    ['numeric password', 'password: 12345678', '12345678'],
    ['header style', 'x-api-key: zz99yy88xx77', 'zz99yy88xx77'],
    ['random high entropy', `blob ${RANDOM} end`, RANDOM],
  ])('%s', (_name, input, secret) => {
    expect(redactText(input)).not.toContain(secret);
  });

  it('removes a PEM private key block', () => {
    const pem = [
      '-----BEGIN RSA PRIVATE KEY-----',
      'MIIEowIBAAKCAQEA',
      '-----END RSA PRIVATE KEY-----',
    ].join('\n');
    expect(redactText(`key:\n${pem}\nafter`)).toBe('key:\n[PRIVATE_KEY]\nafter');
  });

  it('removes caller-supplied terms anywhere', () => {
    const r = createRedactor({ terms: ['plainvalue'] });
    expect(r.text('xplainvaluex')).toBe('x[REDACTED]x');
  });

  it('keeps JSON valid when redacting a stringified object', () => {
    const json = JSON.stringify({ apiKey: 'abc123456', nested: { password: 'p4ss!' } }, null, 2);
    expect(JSON.parse(redactText(json))).toEqual({
      apiKey: '[REDACTED]',
      nested: { password: '[REDACTED]' },
    });
  });
});

describe('redactText: false positives (ordinary data must survive)', () => {
  it.each([
    ['git sha', 'commit 3f786850e387550fdab836ed7e6dc881de23001b'],
    ['sha256 hex', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['uuid', 'id 123e4567-e89b-12d3-a456-426614174000'],
    ['iso timestamp', 'at 2026-11-12T08:30:00.000Z'],
    ['epoch ms', 'ts=1762936200000'],
    [
      'sri hash',
      'integrity sha512-Q2j5X9mL3pV7rT1kW8nH4sJ6dF0yG2bC5aE9uI3oP7lK1mN6vB4xZ8qR0tY2wU5e==',
    ],
    ['token counts', 'max_tokens=4096 input_tokens: 1234567 tokenCount=99'],
    ['look-alike names', 'monkey=banana author: Shakespeare secretary=Joan sortKey=createdAt'],
    ['long path', 'apps/playground/app/clayflow/showcase/ShowcaseVersion2Page.tsx'],
    ['long identifier', 'useSomethingVeryLongComponentNameHook2'],
    ['type annotation', 'token: string'],
    ['env placeholder', 'password=${DB_PASSWORD}'],
    ['prose', 'The password policy requires a secret phrase; tokens refresh hourly.'],
    ['version and ip-like', 'v1.2.3.4 build'],
    ['email (pii off by default)', 'mail ops@example.com'],
  ])('%s', (_name, input) => {
    expect(redactText(input)).toBe(input);
  });
});

describe('pii (opt-in)', () => {
  const r = createRedactor({ pii: true });
  it('redacts email, phone, ip and Luhn-valid cards', () => {
    expect(r.text('mail jane.doe+x@example.co.uk')).toBe('mail [EMAIL]');
    expect(r.text('call +1 415 555 0132')).toBe('call [PHONE]');
    expect(r.text('from 192.168.1.20')).toBe('from [IP]');
    expect(r.text('card 4242 4242 4242 4242')).toBe('card [CARD]');
  });
  it('leaves timestamps, dates and non-Luhn numbers alone', () => {
    for (const s of [
      'ts 1762936200000',
      'on 2026-11-12',
      'order 4242424242424241',
      'at 08:30:15',
    ]) {
      expect(r.text(s)).toBe(s);
    }
  });
});

describe('home and user', () => {
  it('replaces the home directory and user name', () => {
    const r = createRedactor({ home: 'C:\\Users\\alice', user: 'alice' });
    expect(r.text('C:/Users/alice/proj by alice')).toBe('~/proj by [USER]');
  });
});

describe('report', () => {
  it('counts hits per rule', () => {
    expect(createRedactor().report(`${OPENAI} and ${GITHUB}`).hits).toEqual({ API_KEY: 2 });
    expect(createRedactor().report('nothing here').hits).toEqual({});
  });
});

describe('redactValue', () => {
  it('redacts nested values and sensitive keys without mutating input', () => {
    const input = {
      user: 'u_1',
      headers: { Authorization: 'Bearer abcDEF123456ghiJKL', 'x-request-id': 'req_9f8e7d' },
      config: [{ clientSecret: 'cs-1', pin: 1234 }],
      usage: { promptTokens: 120, max_tokens: 4096 },
      note: `found ${OPENAI}`,
      ok: true,
    };
    const out = redactValue(input);
    expect(out).toEqual({
      user: 'u_1',
      headers: { Authorization: '[REDACTED]', 'x-request-id': 'req_9f8e7d' },
      config: [{ clientSecret: '[REDACTED]', pin: 1234 }],
      usage: { promptTokens: 120, max_tokens: 4096 },
      note: 'found [API_KEY]',
      ok: true,
    });
    expect(input.headers.Authorization).toBe('Bearer abcDEF123456ghiJKL');
  });

  it('handles cycles, errors and dates', () => {
    const a: Record<string, unknown> = { password: 'hunter22' };
    a.self = a;
    const when = new Date(0);
    const out = redactValue({ a, err: new Error(`bad ${GITHUB}`), when });
    expect(out.a).toEqual({ password: '[REDACTED]', self: '[Circular]' });
    expect((out.err as Error).message).toBe('bad [API_KEY]');
    expect(out.when).toBe(when);
  });
});

describe('isSensitiveKey', () => {
  it.each([
    'apiKey',
    'OPENAI_API_KEY',
    'accessToken',
    'refresh_token',
    'password',
    'x-api-key',
    'Authorization',
    'token',
  ])('%s is sensitive', (k) => expect(isSensitiveKey(k)).toBe(true));
  it.each([
    'tokenCount',
    'max_tokens',
    'promptTokens',
    'sortKey',
    'primaryKey',
    'monkey',
    'author',
    'idempotencyKey',
  ])('%s is not', (k) => expect(isSensitiveKey(k)).toBe(false));
});
