// A structured JSON feed with no bespoke adapter: declarative field mapping only, no code per
// source. Ported from Sutra modules/manthan/src/sources/json-api.ts.
import type { FeedItem } from './feed-item.js';
import { MAX_FEED_ENTRIES, crawlerUserAgent, type FetchFeedOptions } from './rss.js';
import { SafeFetchError, fetchSafeBody, htmlToText, isFetchableUrl } from './page.js';

/** Reads a dot path (`"a.b.c"`) off a value; `null` if any step is missing or not an object. */
export function readPath(value: unknown, path: string): unknown {
  let cur = value;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur ?? null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

const toDate = (v: unknown): Date | null => {
  // Epoch milliseconds, as some APIs give a creation time.
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v);
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

export interface JsonApiConfig {
  url: string;
  /** Dot path to the array of items in the response body. Omit if the body itself is the array. */
  itemsPath?: string;
  /** Dot paths, relative to one item. */
  fields: {
    url: string;
    title: string;
    id?: string;
    text?: string;
    author?: string;
    publishedAt?: string;
    /** Builds the url from the id instead, e.g. "https://example.com/item/{id}". */
    urlTemplate?: string;
    /** Extra fields appended to the text as "label: value" lines. */
    extra?: Record<string, string>;
  };
}

/** Pure: a parsed JSON body to items, at most MAX_FEED_ENTRIES. */
export function parseJsonApi(body: unknown, config: JsonApiConfig, now: Date): FeedItem[] {
  const list = config.itemsPath ? readPath(body, config.itemsPath) : body;
  if (!Array.isArray(list)) {
    throw new Error(
      `Expected an array at ${config.itemsPath ?? '(response root)'} in ${config.url}`,
    );
  }
  const { fields } = config;
  return list.slice(0, MAX_FEED_ENTRIES).flatMap((item: unknown): FeedItem[] => {
    const id = fields.id ? readPath(item, fields.id) : null;
    const hasId = typeof id === 'string' || typeof id === 'number';
    const url =
      fields.urlTemplate && hasId
        ? fields.urlTemplate.replace('{id}', encodeURIComponent(String(id)))
        : str(readPath(item, fields.url));
    const title = str(readPath(item, fields.title));
    if (!url || !title || !isFetchableUrl(url)) return [];
    const extra = Object.entries(fields.extra ?? {}).flatMap(([label, path]) => {
      const v = readPath(item, path);
      const shown = Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? null : v;
      return shown === null || shown === '' ? [] : [`${label}: ${String(shown)}`];
    });
    const main = fields.text ? str(readPath(item, fields.text)) : null;
    const text = [main, ...extra].filter(Boolean).join('\n') || null;
    return [
      {
        source: 'json_api',
        id: hasId ? String(id) : null,
        url,
        title: htmlToText(title).slice(0, 200),
        text: text ? htmlToText(text).slice(0, 4000) : null,
        author: fields.author ? str(readPath(item, fields.author)) : null,
        publishedAt: fields.publishedAt ? toDate(readPath(item, fields.publishedAt)) : null,
        discoveredAt: now,
        tags: [],
        metadata: {},
      },
    ];
  });
}

/** Fetches a JSON API through the SSRF-guarded fetch and maps it to items. */
export async function fetchJsonApi(
  fetchFn: typeof fetch,
  config: JsonApiConfig,
  options: FetchFeedOptions,
): Promise<FeedItem[]> {
  const { text } = await fetchSafeBody(fetchFn, config.url, {
    timeoutMs: 15_000,
    maxBytes: 2_000_000,
    ...options.fetchOptions,
    headers: { 'user-agent': crawlerUserAgent(options.contact), accept: 'application/json' },
  });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch (err) {
    throw new SafeFetchError(
      `API ${config.url} returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      { cause: err },
    );
  }
  return parseJsonApi(body, config, options.now);
}
