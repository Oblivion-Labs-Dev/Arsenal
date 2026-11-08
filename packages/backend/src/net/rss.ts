// RSS 2.0 / RSS 1.0 (RDF) / Atom reading, ported from Sutra modules/manthan/src/sources/rss.ts.
// The Sutra-specific arXiv normalizer and "decision" filter are replaced by a generic `filter`.
import { parseFeed } from 'feedsmith';
import type { FeedItem } from './feed-item.js';
import {
  DEFAULT_USER_AGENT,
  fetchSafeBody,
  htmlToText,
  type FetchSafeBodyOptions,
} from './page.js';

/** The most items one feed read ever returns. */
export const MAX_FEED_ENTRIES = 50;

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A feed's own order is not a promise: newest first, undated last, so the cap keeps what is new. */
const newestFirst = (a: FeedItem, b: FeedItem) =>
  (b.publishedAt?.getTime() ?? -Infinity) - (a.publishedAt?.getTime() ?? -Infinity);

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');

/**
 * One entry that holds a whole day of releases (one entry per date, an <h2> per product) as one
 * item per <h2> section, each with its own title and link. The section is named in the query,
 * not only the fragment, because fragments are dropped when URLs are compared.
 */
function sections(entry: FeedItem, html: string): FeedItem[] {
  const parts = html.split(/<h2[^>]*>/i).slice(1);
  if (parts.length === 0) return [entry];
  const seen = new Map<string, number>();
  return parts.map((part) => {
    const [heading = '', ...rest] = part.split(/<\/h2>/i);
    const product = htmlToText(heading);
    const text = htmlToText(rest.join('</h2>'));
    // The first line long enough to be a sentence: a bare "Feature" or "Fixed" label is not one.
    const summary = (text.split('\n').find((l) => l.trim().length > 25) ?? text).trim();
    const count = (seen.get(slug(product)) ?? 0) + 1;
    seen.set(slug(product), count);
    const key = `${slug(product)}${count > 1 ? `-${count}` : ''}`;
    const url = new URL(entry.url);
    url.searchParams.set('section', `${slug(entry.title)}-${key}`);
    return {
      ...entry,
      id: `${entry.id ?? entry.url}/${key}`,
      url: url.toString(),
      title: `${product}: ${summary.slice(0, 140)}`,
      text: text.slice(0, 4000),
      tags: [product],
    };
  });
}

export interface ParseFeedOptions {
  /** Each <h2> section of an entry becomes its own item. */
  splitSections?: boolean;
  /** Put in front of every title: a release feed's entries are named "v0.9.0", not the project. */
  titlePrefix?: string;
  /** Kept on every item's metadata (e.g. region, topic). */
  metadata?: Record<string, string>;
  /** Keep at most this many of the newest items (never more than MAX_FEED_ENTRIES). */
  limit?: number;
  /** Keep only items this returns true for. Applied before sorting and the limit. */
  filter?: (item: FeedItem) => boolean;
}

/** Pure: RSS 2.0, RSS 1.0 (RDF) or Atom text to items. Other formats throw. */
export function parseFeedDocument(
  xml: string,
  now: Date,
  options: ParseFeedOptions = {},
): FeedItem[] {
  const parsed = parseFeed(xml);
  const expand = (entry: FeedItem, html: string | null) =>
    options.splitSections && html ? sections(entry, html) : [entry];
  let items: FeedItem[];
  if (parsed.format === 'rss') {
    items =
      parsed.feed.items?.flatMap((item) => {
        if (!item.link || !item.title) return [];
        const body = item.description ?? item.content?.encoded ?? null;
        const tags =
          item.categories?.map((c) => c.name).filter((n): n is string => Boolean(n)) ?? [];
        return expand(
          {
            source: 'rss',
            id: item.guid?.value ?? item.link,
            url: item.link,
            title: htmlToText(item.title),
            text: body ? htmlToText(body).slice(0, 4000) : null,
            author: item.authors?.[0]?.name ?? item.dc?.creators?.[0] ?? null,
            publishedAt: toDate(item.pubDate),
            discoveredAt: now,
            tags,
            metadata: {},
          },
          body,
        );
      }) ?? [];
  } else if (parsed.format === 'atom') {
    items =
      parsed.feed.entries?.flatMap((entry) => {
        const link = (entry.links?.find((l) => !l.rel || l.rel === 'alternate') ?? entry.links?.[0])
          ?.href;
        if (!link || !entry.title?.value) return [];
        const body = entry.content?.value ?? entry.summary?.value ?? null;
        const tags =
          entry.categories?.map((c) => c.label ?? c.term).filter((n): n is string => Boolean(n)) ??
          [];
        return expand(
          {
            source: 'rss',
            id: entry.id ?? link,
            url: link,
            title: htmlToText(entry.title.value),
            text: body ? htmlToText(body).slice(0, 4000) : null,
            author: entry.authors?.[0]?.name ?? null,
            publishedAt: toDate(entry.published ?? entry.updated),
            discoveredAt: now,
            tags,
            // A changelog entry is edited after it is published: keep when, apart from first.
            metadata: entry.updated ? { updatedAt: entry.updated } : {},
          },
          body,
        );
      }) ?? [];
  } else if (parsed.format === 'rdf') {
    // RSS 1.0: authors, date and DOI are Dublin Core.
    items =
      parsed.feed.items?.flatMap((item) => {
        if (!item.link || !item.title) return [];
        const body = item.content?.encoded ?? item.description ?? null;
        const doi = item.dc?.identifiers?.find((i) => i.startsWith('doi:'))?.slice(4);
        return expand(
          {
            source: 'rss',
            id: item.rdf?.about ?? item.link,
            url: item.link,
            title: htmlToText(item.title),
            text: body ? htmlToText(body).slice(0, 4000) : null,
            author: item.dc?.creators?.join(', ') ?? null,
            publishedAt: toDate(item.dc?.dates?.[0]),
            discoveredAt: now,
            tags: [],
            metadata: doi ? { doi } : {},
          },
          body,
        );
      }) ?? [];
  } else {
    throw new Error(`Unsupported feed format: ${parsed.format}`);
  }
  const prefix = options.titlePrefix ? `${options.titlePrefix} ` : '';
  const filter = options.filter;
  return (
    items
      // Only web links: a feed's javascript: or data: "link" is dropped here.
      .filter((item) => /^https?:\/\//i.test(item.url))
      .filter((item) => !filter || filter(item))
      .sort(newestFirst)
      .slice(0, Math.min(options.limit ?? MAX_FEED_ENTRIES, MAX_FEED_ENTRIES))
      .map((item) => ({
        ...item,
        ...(prefix ? { title: `${prefix}${item.title}` } : {}),
        metadata: { ...item.metadata, ...options.metadata },
      }))
  );
}

export interface RssConfig extends ParseFeedOptions {
  url: string;
}

export interface FetchFeedOptions {
  now: Date;
  /** Appended to the user-agent so a site owner can reach you. */
  contact?: string;
  /** Passed through to `fetchSafeBody` (lookup, dispatcher, signal, timeoutMs, maxBytes). */
  fetchOptions?: Omit<FetchSafeBodyOptions, 'headers'>;
}

/** The user-agent for polite crawling, with an optional contact. */
export function crawlerUserAgent(contact?: string): string {
  return contact ? `${DEFAULT_USER_AGENT} contact ${contact}` : DEFAULT_USER_AGENT;
}

/** Fetches a feed through the SSRF-guarded fetch and parses it. */
export async function fetchRssItems(
  fetchFn: typeof fetch,
  config: RssConfig,
  options: FetchFeedOptions,
): Promise<FeedItem[]> {
  const { url, ...parseOptions } = config;
  const { text } = await fetchSafeBody(fetchFn, url, {
    timeoutMs: 15_000,
    maxBytes: 2_000_000,
    ...options.fetchOptions,
    headers: {
      'user-agent': crawlerUserAgent(options.contact),
      accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml',
    },
  });
  return parseFeedDocument(text, options.now, parseOptions);
}
