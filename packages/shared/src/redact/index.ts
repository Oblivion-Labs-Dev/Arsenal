// Deterministic secret and PII redaction, safe in browsers and on servers (no Node imports).
//
// Ported from AgentSkills `history-learning/scripts/lib/redact.mjs` (same owner, no separate
// licence) and hardened for Arsenal: known credential formats first, then secret-looking
// key/value assignments (judged by the key's words, so `max_tokens` and `monkey` survive),
// then a guarded high-entropy rule. Personal data (email, phone, IP, card) is opt-in, so
// ordinary logs keep their ids, hashes, timestamps and counts.

export type RedactionRule =
  | 'PRIVATE_KEY'
  | 'JWT'
  | 'API_KEY'
  | 'URL_CREDENTIALS'
  | 'BEARER'
  | 'BASIC_AUTH'
  | 'SECRET_ASSIGNMENT'
  | 'HIGH_ENTROPY'
  | 'EMAIL'
  | 'PHONE'
  | 'IP'
  | 'CARD'
  | 'HOME'
  | 'USERNAME'
  | 'TERM';

export interface PiiOptions {
  email?: boolean;
  phone?: boolean;
  ip?: boolean;
  /** Payment card numbers (Luhn-checked). */
  card?: boolean;
}

export interface RedactOptions {
  /** Personal data rules. `true` enables all of them. Default: none. */
  pii?: boolean | PiiOptions;
  /** Guarded high-entropy token rule. Default true. */
  entropy?: boolean;
  /** A home directory to replace with `~` (pass `os.homedir()` on a server). */
  home?: string;
  /** A user name to replace with `[USER]` (ignored when shorter than 3 characters). */
  user?: string;
  /** Literal terms to always remove, e.g. a project's own secret values. */
  terms?: readonly string[];
  /** Placeholder for a redacted value. Default `[REDACTED]`. */
  placeholder?: string;
}

export interface RedactionReport {
  text: string;
  /** How often each rule fired. Empty when nothing was redacted. */
  hits: Partial<Record<RedactionRule, number>>;
}

export interface Redactor {
  /** Redacts one string. */
  text(input: string): string;
  /** Redacts one string and reports which rules fired. */
  report(input: string): RedactionReport;
  /** Returns a redacted deep copy of any value: strings, arrays, plain objects, Errors. */
  value<T>(input: T): T;
}

const API_KEY_FORMATS = [
  'sk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}',
  '(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}',
  'gh[pousr]_[A-Za-z0-9]{20,}',
  'github_pat_[A-Za-z0-9_]{20,}',
  'xox[abprs]-[A-Za-z0-9-]{10,}',
  'AKIA[0-9A-Z]{16}',
  'AIza[0-9A-Za-z_-]{30,}',
  'glpat-[A-Za-z0-9_-]{20,}',
  're_[A-Za-z0-9]{20,}',
  'SG\\.[A-Za-z0-9_-]{16,}\\.[A-Za-z0-9_-]{16,}',
  'npm_[A-Za-z0-9]{30,}',
  'hf_[A-Za-z0-9]{30,}',
];

const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const API_KEY = new RegExp(`\\b(?:${API_KEY_FORMATS.join('|')})\\b`, 'g');
const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s:@/]+:[^\s@/]+@/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/g;
const BASIC_AUTH = /\bBasic\s+[A-Za-z0-9+/]{8,}={0,2}/g;
// A name, its separator (`=`, `:`, quoted JSON keys) and a value up to a delimiter.
const ASSIGNMENT = /\b([A-Za-z_][A-Za-z0-9_-]*)(["']?\s*[:=]\s*["']?)([^\s"'`,;}<>)\]]+)/g;
// Long base62/base64url runs. `/` and `.` end a run, so paths and file names never form one.
const ENTROPY_CANDIDATE = /(?<![A-Za-z0-9_+-])[A-Za-z0-9_+-]{32,}={0,2}(?![A-Za-z0-9_+-])/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE = /(?<![\w.:-])\+?\d{1,3}[\s.-]?\(?\d{3,4}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}(?![\w.:-])/g;
const IP = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const CARD = /(?<![\d-])[2-6]\d{3}(?:[ -]?\d{4}){2}[ -]?\d{1,4}(?:[ -]?\d{3})?(?![\d-])/g;

const ALWAYS_SECRET_WORDS = new Set([
  'password',
  'passwd',
  'pwd',
  'passphrase',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'authorization',
  'cookie',
  'apikey',
  'privatekey',
  'accesskey',
]);
// `token` and `key` are only secret as the last word of a name with a credential-ish word
// before it (`accessToken`, `API_KEY`), not in `tokenCount`, `max_tokens` or `sortKey`.
const KEY_QUALIFIERS = new Set([
  'api',
  'access',
  'private',
  'secret',
  'signing',
  'encryption',
  'auth',
  'client',
  'service',
  'master',
  'license',
  'session',
  'refresh',
  'bearer',
  'id',
  'oauth',
  'github',
  'npm',
  'deploy',
]);
const DIGIT_SECRET_WORDS = new Set(['password', 'passwd', 'pwd', 'pin', 'passcode', 'secret']);
const NON_VALUES = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'none',
  'string',
  'number',
  'boolean',
  'unknown',
  'any',
  'required',
  'optional',
]);

/** Splits `OPENAI_API_KEY`, `accessToken`, `x-api-key` into lowercase words. */
function nameWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_.-]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** True when a field or variable name says its value is a credential. */
export function isSensitiveKey(name: string): boolean {
  const words = nameWords(name);
  if (words.length === 0) return false;
  if (words.some((w) => ALWAYS_SECRET_WORDS.has(w))) return true;
  const last = words[words.length - 1]!;
  if (last === 'token')
    return (
      words.length === 1 || words.slice(0, -1).some((w) => KEY_QUALIFIERS.has(w) || w === 'token')
    );
  if (last === 'key') return words.slice(0, -1).some((w) => KEY_QUALIFIERS.has(w));
  return false;
}

function secretValue(name: string, value: string): boolean {
  if (value.length < 3) return false;
  if (/^[[$<{%]/.test(value) || value.startsWith('process.env')) return false;
  if (NON_VALUES.has(value.toLowerCase())) return false;
  if (/^\d+$/.test(value)) return nameWords(name).some((w) => DIGIT_SECRET_WORDS.has(w));
  return true;
}

function shannon(s: string): number {
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let bits = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    bits -= p * Math.log2(p);
  }
  return bits;
}

/** Random-looking enough to be a credential: mixed case, several digits, high entropy. */
function looksRandom(token: string): boolean {
  const body = token.replace(/=+$/, '');
  if (/^(?:sha(?:1|256|384|512)|md5)-/i.test(body)) return false; // subresource integrity hash
  const digits = body.replace(/\D/g, '').length;
  const upper = body.replace(/[^A-Z]/g, '').length;
  const lower = body.replace(/[^a-z]/g, '').length;
  return digits >= 3 && upper >= 3 && lower >= 3 && shannon(body) >= 4;
}

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function createRedactor(options: RedactOptions = {}): Redactor {
  const placeholder = options.placeholder ?? '[REDACTED]';
  const pii: PiiOptions =
    options.pii === true ? { email: true, phone: true, ip: true, card: true } : options.pii || {};
  const entropy = options.entropy ?? true;
  const homeParts = options.home?.split(/[\\/]+/).filter(Boolean) ?? [];
  const homeRe =
    homeParts.length > 1 ? new RegExp(homeParts.map(escapeRe).join('[\\\\/]+'), 'gi') : null;
  const userRe =
    options.user && options.user.length > 2
      ? new RegExp(`\\b${escapeRe(options.user)}\\b`, 'gi')
      : null;
  const terms = (options.terms ?? [])
    .filter((t) => t.length > 0)
    .map((t) => new RegExp(escapeRe(t), 'g'));

  function report(input: string): RedactionReport {
    let out = String(input);
    const hits: RedactionReport['hits'] = {};
    const sub = (
      rule: RedactionRule,
      re: RegExp,
      repl: (match: string, ...groups: string[]) => string,
    ) => {
      out = out.replace(re, (match: string, ...groups: string[]) => {
        const next = repl(match, ...groups);
        if (next !== match) hits[rule] = (hits[rule] ?? 0) + 1;
        return next;
      });
    };

    // User-supplied terms first, so a known secret is removed wherever it appears.
    for (const re of terms) sub('TERM', re, () => placeholder);
    sub('PRIVATE_KEY', PRIVATE_KEY, () => `[PRIVATE_KEY]`);
    sub('JWT', JWT, () => '[JWT]');
    sub('API_KEY', API_KEY, () => '[API_KEY]');
    sub('URL_CREDENTIALS', URL_CREDENTIALS, (_m, scheme) => `${scheme}${placeholder}@`);
    sub('BEARER', BEARER, () => `Bearer ${placeholder}`);
    sub('BASIC_AUTH', BASIC_AUTH, () => `Basic ${placeholder}`);
    sub('SECRET_ASSIGNMENT', ASSIGNMENT, (m, name, sep, value) =>
      isSensitiveKey(name!) && secretValue(name!, value!) ? `${name}${sep}${placeholder}` : m,
    );
    if (entropy)
      sub('HIGH_ENTROPY', ENTROPY_CANDIDATE, (m) => (looksRandom(m) ? '[HIGH_ENTROPY]' : m));
    if (pii.email) sub('EMAIL', EMAIL, () => '[EMAIL]');
    if (pii.card) sub('CARD', CARD, (m) => (luhn(m.replace(/\D/g, '')) ? '[CARD]' : m));
    // A bare digit run is a timestamp or id; a phone number has a `+` or separators.
    if (pii.phone) sub('PHONE', PHONE, (m) => (/^\+|[\s.()-]/.test(m) ? '[PHONE]' : m));
    if (pii.ip) sub('IP', IP, () => '[IP]');
    if (homeRe) sub('HOME', homeRe, () => '~');
    if (userRe) sub('USERNAME', userRe, () => '[USER]');
    return { text: out, hits };
  }

  const text = (input: string) => report(input).text;

  function value<T>(input: T): T {
    const seen = new WeakMap<object, unknown>();
    const walk = (v: unknown, key: string | undefined, depth: number): unknown => {
      if (typeof v === 'string') {
        return key !== undefined && isSensitiveKey(key) && secretValue(key, v)
          ? placeholder
          : text(v);
      }
      if (typeof v === 'number' || typeof v === 'bigint') {
        return key !== undefined && isSensitiveKey(key) && secretValue(key, String(v))
          ? placeholder
          : v;
      }
      if (v === null || typeof v !== 'object') return v;
      if (seen.has(v)) return '[Circular]';
      if (depth > 32) return '[MaxDepth]';
      if (v instanceof Date || v instanceof RegExp) return v;
      if (v instanceof Error) {
        const copy = new Error(text(v.message));
        copy.name = v.name;
        copy.stack = v.stack === undefined ? undefined : text(v.stack);
        seen.set(v, copy);
        return copy;
      }
      if (Array.isArray(v)) {
        const out: unknown[] = [];
        seen.set(v, out);
        for (const item of v) out.push(walk(item, key, depth + 1));
        return out;
      }
      if (v instanceof Map) {
        const out = new Map();
        seen.set(v, out);
        for (const [k, item] of v)
          out.set(k, walk(item, typeof k === 'string' ? k : undefined, depth + 1));
        return out;
      }
      const proto = Object.getPrototypeOf(v);
      if (proto !== Object.prototype && proto !== null) return v; // class instances are left alone
      const out: Record<string, unknown> = {};
      seen.set(v, out);
      for (const [k, item] of Object.entries(v)) out[k] = walk(item, k, depth + 1);
      return out;
    };
    return walk(input, undefined, 0) as T;
  }

  return { text, report, value };
}

const defaultRedactor = createRedactor();

/** Redacts credentials from a string with the default (secrets-only) rules. */
export const redactText = (input: string): string => defaultRedactor.text(input);

/** Redacted deep copy of a value with the default (secrets-only) rules. */
export const redactValue = <T>(input: T): T => defaultRedactor.value(input);
