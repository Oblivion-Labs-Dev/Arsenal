import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import {
  CliTimeoutError,
  SafeFetchError,
  createProxyRoute,
  decorrelatedJitter,
  extractLinks,
  fetchHtmlLinks,
  fetchJsonApi,
  fetchRobots,
  fetchSafeBody,
  fullJitter,
  guardLookup,
  htmlToText,
  isFetchableUrl,
  isPrivateOrReservedIp,
  parseFeedDocument,
  parseHtmlLinks,
  parseJsonApi,
  readPath,
  retryWithJitter,
  robotsDisallows,
  runCli,
  type LookupCallback,
} from './index.js';

type FetchCall = { url: string; init: RequestInit | undefined };

/** A fake fetch that answers from a URL → Response factory and records every call. */
function fakeFetch(routes: Record<string, () => Response>) {
  const calls: FetchCall[] = [];
  const fn = async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    const route = routes[url];
    if (!route) return new Response('not found', { status: 404 });
    return route();
  };
  return { fetch: fn as typeof fetch, calls };
}

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

describe('SSRF guards', () => {
  it('classifies private and reserved addresses', () => {
    for (const ip of [
      '127.0.0.1',
      '10.1.2.3',
      '192.168.0.1',
      '172.16.5.5',
      '169.254.169.254',
      '::1',
      '0.0.0.0',
    ])
      expect(isPrivateOrReservedIp(ip)).toBe(true);
    for (const ip of ['93.184.216.34', '8.8.8.8']) expect(isPrivateOrReservedIp(ip)).toBe(false);
  });

  it('only allows public http(s) URLs', () => {
    expect(isFetchableUrl('https://example.com/a')).toBe(true);
    expect(isFetchableUrl('ftp://example.com')).toBe(false);
    expect(isFetchableUrl('http://localhost:3000')).toBe(false);
    expect(isFetchableUrl('http://127.0.0.1/')).toBe(false);
    expect(isFetchableUrl('https://user:pw@example.com')).toBe(false);
    expect(isFetchableUrl('not a url')).toBe(false);
  });

  it('guardLookup fails connections that resolve to a private address', async () => {
    const run = (address: string) =>
      new Promise<{ error: Error | null; address: unknown }>((resolve) => {
        const guarded = guardLookup((_h, _o, cb: LookupCallback) => cb(null, address, 4));
        guarded('example.com', {}, (error, addr) => resolve({ error, address: addr }));
      });
    const bad = await run('10.0.0.1');
    expect(bad.error).toBeInstanceOf(SafeFetchError);
    const good = await run('93.184.216.34');
    expect(good.error).toBeNull();
    expect(good.address).toBe('93.184.216.34');
  });
});

describe('fetchSafeBody', () => {
  it('returns the body of a public page', async () => {
    const { fetch } = fakeFetch({ 'https://example.com/': () => new Response('hello') });
    const result = await fetchSafeBody(fetch, 'https://example.com/', { lookup: publicLookup });
    expect(result.text).toBe('hello');
  });

  it('refuses a disallowed URL without calling fetch', async () => {
    const { fetch, calls } = fakeFetch({});
    await expect(fetchSafeBody(fetch, 'http://127.0.0.1/')).rejects.toThrow('URL not allowed');
    expect(calls).toHaveLength(0);
  });

  it('refuses a host that resolves to a private address', async () => {
    const { fetch, calls } = fakeFetch({});
    await expect(
      fetchSafeBody(fetch, 'https://evil.example/', {
        lookup: async () => [{ address: '169.254.169.254', family: 4 }],
      }),
    ).rejects.toThrow('resolves to private address');
    expect(calls).toHaveLength(0);
  });

  it('revalidates every redirect hop', async () => {
    const { fetch, calls } = fakeFetch({
      'https://example.com/': () =>
        new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } }),
    });
    await expect(fetchSafeBody(fetch, 'https://example.com/')).rejects.toThrow(
      'Redirect URL not allowed',
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]!.init?.redirect).toBe('manual');
  });

  it('bounds the number of redirects', async () => {
    const { fetch } = fakeFetch({
      'https://example.com/': () =>
        new Response(null, { status: 301, headers: { location: 'https://example.com/' } }),
    });
    await expect(fetchSafeBody(fetch, 'https://example.com/', { maxRedirects: 2 })).rejects.toThrow(
      'Invalid or excessive redirects',
    );
  });

  it('reports the status of a non-OK response', async () => {
    const { fetch } = fakeFetch({});
    const error = await fetchSafeBody(fetch, 'https://example.com/missing').catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(SafeFetchError);
    expect((error as SafeFetchError).status).toBe(404);
  });

  it('stops reading past the size limit', async () => {
    const { fetch } = fakeFetch({ 'https://example.com/': () => new Response('x'.repeat(5000)) });
    await expect(fetchSafeBody(fetch, 'https://example.com/', { maxBytes: 100 })).rejects.toThrow(
      'Response exceeds size limit of 100 bytes',
    );
  });
});

describe('HTML helpers', () => {
  it('turns HTML into readable text without scripts', () => {
    const text = htmlToText(
      '<html><script>alert(1)</script><p>Hello &amp; welcome</p><p>Second</p></html>',
    );
    expect(text).toContain('Hello & welcome');
    expect(text).toContain('Second');
    expect(text).not.toContain('alert');
  });

  it('resolves links against the base and keeps only http(s) ones', () => {
    const links = extractLinks(
      '<a href="/a#top">A</a><a href="https://other.com/b">B</a><a href="mailto:x@example.com">x</a>',
      'https://example.com/',
    );
    expect(links).toContain('https://example.com/a');
    expect(links).toContain('https://other.com/b');
    expect(links).toHaveLength(2);
  });
});

describe('robots.txt', () => {
  const robots =
    'User-agent: *\nDisallow: /private\nAllow: /private/open\n\nUser-agent: bot\nDisallow: /';
  it('applies the * group with longest-match Allow', () => {
    expect(robotsDisallows(robots, '/private/x')).toBe(true);
    expect(robotsDisallows(robots, '/private/open/y')).toBe(false);
    expect(robotsDisallows(robots, '/blog')).toBe(false);
  });

  it('treats a missing robots.txt as allowed but fails closed on a server error', async () => {
    const missing = fakeFetch({});
    await expect(fetchRobots(missing.fetch, 'https://example.com', { now: new Date('2026-01-01T00:00:00Z') })).resolves.toBe('');
    const broken = fakeFetch({
      'https://example.com/robots.txt': () => new Response('oops', { status: 503 }),
    });
    await expect(fetchRobots(broken.fetch, 'https://example.com', { now: new Date('2026-01-01T00:00:00Z') })).rejects.toThrow(
      'Could not read https://example.com/robots.txt',
    );
  });

  it('fetchHtmlLinks refuses a page robots.txt disallows', async () => {
    const { fetch } = fakeFetch({
      'https://example.com/robots.txt': () => new Response('User-agent: *\nDisallow: /blog'),
    });
    await expect(
      fetchHtmlLinks(fetch, { url: 'https://example.com/blog', linkPattern: '^/blog/' }, { now: new Date('2026-01-01T00:00:00Z') }),
    ).rejects.toThrow('asks crawlers not to read');
  });
});

describe('feeds', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  it('parses RSS 2.0', () => {
    const items = parseFeedDocument(
      `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>
        <item><title>First post</title><link>https://example.com/1</link><guid>g1</guid>
        <pubDate>Mon, 01 Dec 2025 10:00:00 GMT</pubDate><description>Body one</description></item>
      </channel></rss>`,
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source: 'rss',
      url: 'https://example.com/1',
      title: 'First post',
    });
    expect(items[0]!.publishedAt?.toISOString()).toBe('2025-12-01T10:00:00.000Z');
  });

  it('parses Atom', () => {
    const items = parseFeedDocument(
      `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>T</title>
        <entry><title>Atom entry</title><id>urn:1</id><link href="https://example.com/a"/>
        <updated>2025-11-01T00:00:00Z</updated><summary>S</summary></entry></feed>`,
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ url: 'https://example.com/a', title: 'Atom entry' });
  });

  it('throws on a document that is not a feed', () => {
    expect(() => parseFeedDocument('<html><body>nope</body></html>', now)).toThrow();
  });

  it('parses index-page links that match the pattern', () => {
    const items = parseHtmlLinks(
      '<a href="/blog/2025-01-02-hello-world">Hello world</a><a href="/about">About</a>',
      { url: 'https://example.com/blog', linkPattern: '^/blog/' },
      now,
    );
    expect(items.map((i) => i.url)).toEqual(['https://example.com/blog/2025-01-02-hello-world']);
  });

  it('reads dot paths and maps JSON API items', () => {
    expect(readPath({ a: { b: [1, 2] } }, 'a.b')).toEqual([1, 2]);
    expect(readPath({ a: 1 }, 'a.missing')).toBeNull();
    const items = parseJsonApi(
      { data: { hits: [{ id: 7, name: 'Item seven' }] } },
      {
        url: 'https://api.example.com/x',
        itemsPath: 'data.hits',
        fields: {
          url: 'url',
          title: 'name',
          id: 'id',
          urlTemplate: 'https://example.com/item/{id}',
        },
      },
      now,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ url: 'https://example.com/item/7', title: 'Item seven' });
  });

  it('fetchJsonApi fails loudly on invalid JSON', async () => {
    const { fetch } = fakeFetch({ 'https://api.example.com/x': () => new Response('{not json') });
    await expect(
      fetchJsonApi(
        fetch,
        { url: 'https://api.example.com/x', fields: { url: 'u', title: 't' } },
        { now: new Date('2026-01-01T00:00:00Z') },
      ),
    ).rejects.toThrow();
  });
});

describe('jitter', () => {
  it('keeps delays within bounds', () => {
    expect(decorrelatedJitter(100, 1000, undefined, () => 0)).toBe(100);
    expect(decorrelatedJitter(100, 1000, 900, () => 1)).toBe(1000);
    expect(fullJitter(100, 1000, 3, () => 1)).toBe(400);
    expect(fullJitter(100, 1000, 10, () => 0.5)).toBe(500);
  });

  it('retries with injected sleep and stops when shouldRetry says no', async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const value = await retryWithJitter(
      async () => {
        calls++;
        if (calls < 3) throw new Error('flaky');
        return 'ok';
      },
      { attempts: 3, sleepFn: async (ms) => void sleeps.push(ms), random: () => 0 },
    );
    expect(value).toBe('ok');
    expect(sleeps).toHaveLength(2);

    const fatal = vi.fn(async () => {
      throw new Error('fatal');
    });
    await expect(
      retryWithJitter(fatal, { attempts: 5, shouldRetry: () => false, sleepFn: async () => {} }),
    ).rejects.toThrow('fatal');
    expect(fatal).toHaveBeenCalledTimes(1);
  });
});

describe('runCli', () => {
  const node = process.execPath;

  it('runs a process with stdin and returns its output', async () => {
    const result = await runCli(
      [node, '-e', 'process.stdin.on("data", d => process.stdout.write(String(d).toUpperCase()))'],
      'hello',
      process.cwd(),
      10_000,
    );
    expect(result).toEqual({ code: 0, stdout: 'HELLO', stderr: '' });
  });

  it('kills a process that outlives its time limit', async () => {
    await expect(
      runCli([node, '-e', 'setInterval(() => {}, 1000)'], '', process.cwd(), 300),
    ).rejects.toBeInstanceOf(CliTimeoutError);
  });

  it('stops when the caller aborts', async () => {
    const controller = new AbortController();
    const running = runCli(
      [node, '-e', 'setInterval(() => {}, 1000)'],
      '',
      process.cwd(),
      10_000,
      controller.signal,
    );
    setTimeout(() => controller.abort(new Error('cancelled')), 100);
    await expect(running).rejects.toThrow('cancelled');
  });
});

describe('createProxyRoute', () => {
  const context = { params: { path: ['users', 'a b'] } };

  it('forwards the request without hop headers and streams the response', async () => {
    const { fetch, calls } = fakeFetch({
      'http://backend.test/api/users/a%20b?x=1': () =>
        new Response('plain', { status: 201, headers: { 'content-type': 'text/plain' } }),
    });
    const route = createProxyRoute({ baseUrl: 'http://backend.test/api/', fetch });
    const res = await route.POST(
      new Request('http://app.test/proxy/users/a%20b?x=1', {
        method: 'POST',
        body: 'payload',
        headers: { origin: 'http://app.test', 'x-custom': '1' },
      }),
      context,
    );
    expect(res.status).toBe(201);
    expect(await res.text()).toBe('plain');
    const sent = new Headers(calls[0]!.init?.headers);
    expect(sent.get('origin')).toBeNull();
    expect(sent.get('x-custom')).toBe('1');
  });

  it('gzips JSON for clients that accept it', async () => {
    const { fetch } = fakeFetch({
      'http://backend.test/users/a%20b': () => Response.json({ ok: true }),
    });
    const route = createProxyRoute({ baseUrl: 'http://backend.test', fetch });
    const res = await route.GET(
      new Request('http://app.test/p', { headers: { 'accept-encoding': 'gzip, br' } }),
      context,
    );
    expect(res.headers.get('content-encoding')).toBe('gzip');
    const body = gunzipSync(new Uint8Array(await res.arrayBuffer())).toString();
    expect(JSON.parse(body)).toEqual({ ok: true });
  });

  it('returns 503 and reports the error when the backend is down', async () => {
    const onError = vi.fn();
    const route = createProxyRoute({
      baseUrl: 'http://backend.test',
      fetch: (async () => {
        throw new TypeError('fetch failed');
      }) as typeof fetch,
      onError,
    });
    const res = await route.GET(new Request('http://app.test/p'), context);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Service temporarily unavailable' });
    expect(onError).toHaveBeenCalledWith(expect.any(TypeError), {
      method: 'GET',
      target: 'http://backend.test/users/a%20b',
    });
  });
});
