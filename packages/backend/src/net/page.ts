// Fetching and reading web pages. Everything returned is UNTRUSTED data: it may inform a
// workflow, never instruct one.
// Ported from Sutra packages/core/src/page.ts.

export interface PageContent {
  title: string;
  description: string | null;
  text: string;
  /** Absolute http(s) links on the page, without fragments, in page order, at most 200. */
  links?: string[];
}

/** Why a safe fetch was refused or failed. `status` is set when the server answered. */
export class SafeFetchError extends Error {
  readonly status: number | undefined;

  constructor(message: string, options: { status?: number; cause?: unknown } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'SafeFetchError';
    this.status = options.status;
  }
}

const MAX_TEXT = 20_000;

/** The user-agent sent when the caller passes no headers. */
export const DEFAULT_USER_AGENT = 'Arsenal/0.1 (+https://github.com/Oblivion-Labs-Dev/Arsenal)';

function embeddedV4(h1: number, h2: number): string {
  return [(h1 >> 8) & 0xff, h1 & 0xff, (h2 >> 8) & 0xff, h2 & 0xff].join('.');
}

/**
 * Checks whether an IPv4 or IPv6 address string is private, loopback, link-local,
 * cloud metadata, multicast, broadcast, CGNAT, or reserved.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');

  const v4Match = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4Match) {
    const a = Number(v4Match[1]);
    const b = Number(v4Match[2]);
    const c = Number(v4Match[3]);
    const d = Number(v4Match[4]);
    if (a > 255 || b > 255 || c > 255 || d > 255) return true; // Malformed -> treat as unsafe

    if (a === 0) return true; // 0.0.0.0/8 "this host"
    if (a === 10) return true; // 10.0.0.0/8 private
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
    if (a === 192 && b === 0 && c === 0) return true; // IETF protocol assignments
    if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
    if (a === 192 && b === 88 && c === 99) return true; // 6to4 relay anycast
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmark testing
    if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
    if (a >= 224 && a <= 239) return true; // multicast
    if (a >= 240) return true; // reserved / broadcast
    return false;
  }

  if (
    clean === '::' ||
    clean === '::1' ||
    clean === '0:0:0:0:0:0:0:0' ||
    clean === '0:0:0:0:0:0:0:1'
  )
    return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1, ::ffff:7f00:1, 0:0:0:0:0:ffff:10.0.0.1)
  const mappedMatch = clean.match(/^(?:::ffff:|(?:0:)+ffff:)(.*)$/i);
  if (mappedMatch) {
    const embedded = mappedMatch[1]!;
    if (embedded.includes('.')) return isPrivateOrReservedIp(embedded);
    const hexParts = embedded.split(':');
    if (hexParts.length === 2) {
      const h1 = parseInt(hexParts[0]!, 16);
      const h2 = parseInt(hexParts[1]!, 16);
      if (!Number.isNaN(h1) && !Number.isNaN(h2)) return isPrivateOrReservedIp(embeddedV4(h1, h2));
    }
    return true; // malformed or unrecognized mapped -> block
  }

  // IPv4/IPv6 translation 64:ff9b::/96
  const nat64Match = clean.match(/^64:ff9b::(.*)$/i);
  if (nat64Match) {
    const embedded = nat64Match[1]!;
    if (embedded.includes('.')) return isPrivateOrReservedIp(embedded);
    const hexParts = embedded.split(':');
    if (hexParts.length === 2) {
      const h1 = parseInt(hexParts[0]!, 16);
      const h2 = parseInt(hexParts[1]!, 16);
      if (!Number.isNaN(h1) && !Number.isNaN(h2)) return isPrivateOrReservedIp(embeddedV4(h1, h2));
    }
    return true;
  }

  // 6to4 prefix 2002::/16 carries an IPv4 address in the next 32 bits
  const sixToFourMatch = clean.match(/^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})/i);
  if (sixToFourMatch) {
    const h1 = parseInt(sixToFourMatch[1]!, 16);
    const h2 = parseInt(sixToFourMatch[2]!, 16);
    if (!Number.isNaN(h1) && !Number.isNaN(h2) && isPrivateOrReservedIp(embeddedV4(h1, h2)))
      return true;
  }

  if (/^f[cd][0-9a-f]{2}:/i.test(clean)) return true; // unique local fc00::/7
  if (/^fe[89ab][0-9a-f]:/i.test(clean)) return true; // link-local fe80::/10
  if (/^ff[0-9a-f]{2}:/i.test(clean)) return true; // multicast ff00::/8
  if (/^2001:0?db8:/i.test(clean)) return true; // documentation 2001:db8::/32
  if (/^0?100::/i.test(clean) || /^0?100:0:/i.test(clean)) return true; // discard 100::/64

  return false;
}

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.corp'];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

/** http(s) only, and not obviously local/private. String-level check; not DNS-rebinding proof. */
export function isFetchableUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (!host) return false;
  if (url.username || url.password) return false;
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false;
  if (isPrivateOrReservedIp(host)) return false;
  return true;
}

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  // Common typographic entities in job boards and blogs; unknown ones are left as written.
  mdash: '—',
  ndash: '–',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  middot: '·',
};

/** Decodes named (common subset) and numeric HTML entities. Unknown ones are left as written. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith('#')) {
      const n =
        code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return entities[code.toLowerCase()] ?? match;
  });
}

/** Strips tags and collapses whitespace. Not a sanitizer: output is plain text only. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(
        /<(script|style|noscript|template|svg|nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi,
        ' ',
      )
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|li|h[1-6]|br|tr|td|th|section|article)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** The `content` of the first `<meta name|property="key">` tag, decoded. */
export function metaContent(html: string, key: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const name = /(?:name|property)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (name !== key) continue;
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag);
    const value = content?.[1] ?? content?.[2];
    if (value) return decodeEntities(value).trim();
  }
  return null;
}

/** The page's outbound links, resolved against its own address. Order kept, duplicates dropped. */
export function extractLinks(html: string, base: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    let url: URL;
    try {
      url = new URL(decodeEntities(m[1] ?? m[2] ?? ''), base);
    } catch {
      continue; // Not a URL: skip it.
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    url.hash = '';
    out.add(url.toString());
    if (out.size >= 200) break;
  }
  return [...out];
}

export function extractPage(html: string, base?: string): PageContent {
  const rawTitle = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title = metaContent(html, 'og:title') ?? (rawTitle ? htmlToText(rawTitle) : '');
  const description = metaContent(html, 'og:description') ?? metaContent(html, 'description');
  const main =
    /<article\b[\s\S]*?<\/article>/i.exec(html)?.[0] ?? /<main\b[\s\S]*?<\/main>/i.exec(html)?.[0];
  const body = /<body\b[\s\S]*<\/body>/i.exec(html)?.[0] ?? html;
  return {
    title,
    description,
    text: htmlToText(main ?? body).slice(0, MAX_TEXT),
    ...(base ? { links: extractLinks(html, base) } : {}),
  };
}

export type SafeFetchLookup = (
  hostname: string,
) => Promise<Array<{ address: string; family: number }>>;

export interface FetchSafeBodyOptions {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  maxRedirects?: number;
  /** Pre-flight DNS check for every hop. Falls back to the one set with `setSafeFetchLookup`. */
  lookup?: SafeFetchLookup;
  /**
   * An undici dispatcher passed through to `fetch` (see `createSafeDispatcher`). Falls back to
   * the one set with `setSafeFetchDispatcher`. Opaque so this module never imports undici.
   */
  dispatcher?: unknown;
  /** Caller cancellation, combined with the timeout. */
  signal?: AbortSignal;
}

let defaultLookup: SafeFetchLookup | undefined;

/**
 * The DNS check every `fetchSafeBody` and `fetchPage` uses when the caller passes none.
 * `isFetchableUrl` cannot see where a public-looking hostname resolves (a name pointing at
 * 127.0.0.1, 10.x or the cloud metadata address), so Node apps register a real resolver at
 * startup (see `nodeDnsLookup`).
 */
export function setSafeFetchLookup(lookup: SafeFetchLookup | undefined): void {
  defaultLookup = lookup;
}

let defaultDispatcher: unknown;

/**
 * The connection-level half of the check. Resolving a name, checking it, and then letting
 * `fetch` resolve it again leaves a gap: a hostile DNS server can answer the check with a public
 * address and the connection with 169.254.169.254 (DNS rebinding). Register a dispatcher whose
 * connect `lookup` is wrapped by `guardLookup` so the address connected to is the one checked.
 */
export function setSafeFetchDispatcher(dispatcher: unknown): void {
  defaultDispatcher = dispatcher;
}

/** The callback shape of `dns.lookup`, with or without `all: true`. */
export type LookupCallback = (
  error: Error | null,
  address?: string | { address: string; family: number }[],
  family?: number,
) => void;
export type NodeStyleLookup = (hostname: string, options: object, callback: LookupCallback) => void;

/**
 * Wraps a `dns.lookup`-style resolver so a connection to a private, loopback, link-local or
 * otherwise reserved address fails instead of being made. For a socket's `lookup` option.
 */
export function guardLookup(lookup: NodeStyleLookup): NodeStyleLookup {
  return (hostname, options, callback) =>
    lookup(hostname, options, (error, address, family) => {
      if (error) return callback(error);
      const all = Array.isArray(address)
        ? address
        : address
          ? [{ address, family: family ?? 0 }]
          : [];
      const bad = all.find((a) => isPrivateOrReservedIp(a.address));
      if (bad)
        return callback(
          new SafeFetchError(`Destination resolves to private address: ${bad.address}`),
        );
      callback(null, address, family);
    });
}

async function assertPublicHost(lookup: SafeFetchLookup, url: string, what: string): Promise<void> {
  const addrs = await lookup(new URL(url).hostname);
  for (const a of addrs) {
    if (isPrivateOrReservedIp(a.address)) {
      throw new SafeFetchError(`${what} resolves to private address: ${a.address}`);
    }
  }
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Streams a response body while enforcing a byte cap, bounding redirects, validating every
 * redirect hop against private/forbidden ranges, and rejecting non-OK status codes.
 */
export async function fetchSafeBody(
  fetchFn: typeof fetch,
  url: string,
  options: FetchSafeBodyOptions = {},
): Promise<{ text: string; response: Response; url: string }> {
  if (!isFetchableUrl(url)) throw new SafeFetchError(`URL not allowed: ${url}`);
  const lookup = options.lookup ?? defaultLookup;
  const dispatcher = options.dispatcher ?? defaultDispatcher;
  if (lookup) await assertPublicHost(lookup, url, 'Destination');

  const timeout = AbortSignal.timeout(options.timeoutMs ?? 10_000);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  const maxRedirects = options.maxRedirects ?? 5;
  let current = url;
  let res: Response;

  for (let redirects = 0; ; redirects++) {
    if (!isFetchableUrl(current)) throw new SafeFetchError(`Redirect URL not allowed: ${current}`);
    if (lookup && redirects > 0) await assertPublicHost(lookup, current, 'Redirect destination');

    const init: RequestInit = {
      signal,
      headers: options.headers ?? {
        'user-agent': DEFAULT_USER_AGENT,
        accept: 'text/html,text/plain',
      },
      redirect: 'manual',
    };
    // `dispatcher` is an undici extension to RequestInit (an undici Agent), set without `any`.
    if (dispatcher) Object.assign(init, { dispatcher });
    res = await fetchFn(current, init);

    if (!REDIRECT_STATUSES.has(res.status)) break;
    await res.body?.cancel();
    const location = res.headers.get('location');
    if (!location || redirects >= maxRedirects)
      throw new SafeFetchError('Invalid or excessive redirects', { status: res.status });
    current = new URL(location, current).href;
  }

  if (!res.ok)
    throw new SafeFetchError(`Fetching ${current} returned ${res.status}`, { status: res.status });

  const maxBytes = options.maxBytes ?? 1_000_000;
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let body = '';
  let bytes = 0;
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          await reader.cancel();
          throw new SafeFetchError(`Response exceeds size limit of ${maxBytes} bytes`);
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }
  return { text: body, response: res, url: res.url || current };
}

export interface FetchPageOptions {
  timeoutMs?: number;
  maxBytes?: number;
  lookup?: SafeFetchLookup;
  dispatcher?: unknown;
  userAgent?: string;
  signal?: AbortSignal;
}

/** Fetches a page with a timeout and size cap. Throws on anything that is not readable text. */
export async function fetchPage(
  fetchFn: typeof fetch,
  url: string,
  options: FetchPageOptions = {},
): Promise<PageContent> {
  const {
    text: body,
    response: res,
    url: finalUrl,
  } = await fetchSafeBody(fetchFn, url, {
    timeoutMs: options.timeoutMs ?? 10_000,
    maxBytes: options.maxBytes ?? 1_000_000,
    headers: {
      'user-agent': options.userAgent ?? DEFAULT_USER_AGENT,
      accept: 'text/html,text/plain',
    },
    ...(options.lookup ? { lookup: options.lookup } : {}),
    ...(options.dispatcher ? { dispatcher: options.dispatcher } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  const type = res.headers.get('content-type') ?? '';
  if (!/text\/|html|xml/i.test(type))
    throw new SafeFetchError(`Unsupported content type "${type}"`);

  return /html/i.test(type) || /<html|<body/i.test(body)
    ? extractPage(body, finalUrl)
    : { title: '', description: null, text: body.slice(0, MAX_TEXT) };
}
