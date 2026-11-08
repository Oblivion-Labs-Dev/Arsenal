// A source with no feed (a company blog or changelog, a press page): its index page is read once
// and the links that look like posts become items. Polite by rule: it identifies itself, honours
// robots.txt for every crawler (`*`), reads one page and takes only the newest few links.
// Ported from Sutra modules/manthan/src/sources/html-links.ts.
import type { FeedItem } from './feed-item.js';
import { crawlerUserAgent, type FetchFeedOptions } from './rss.js';
import { SafeFetchError, fetchSafeBody, htmlToText, isFetchableUrl } from './page.js';

export interface HtmlLinksConfig {
  url: string;
  /** A regular expression the link's path (with any query) must match to count as a post. */
  linkPattern: string;
  /** Default 15. */
  limit?: number;
  /** Kept on every item's metadata. */
  metadata?: Record<string, string>;
}

/** Whether robots.txt disallows `path` for every crawler; an Allow for a longer path wins. */
export function robotsDisallows(robots: string, path: string): boolean {
  let starGroup = false;
  let inAgents = false;
  const disallow: string[] = [];
  const allow: string[] = [];
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const [key = '', ...rest] = line.split(':');
    const value = rest.join(':').trim();
    const k = key.toLowerCase();
    if (k === 'user-agent') {
      // Consecutive agent lines form one group; a rule line ends the list of agents.
      starGroup = inAgents ? starGroup || value === '*' : value === '*';
      inAgents = true;
    } else {
      inAgents = false;
      if (!starGroup || !value) continue;
      if (k === 'disallow') disallow.push(value);
      if (k === 'allow') allow.push(value);
    }
  }
  const longest = (rules: string[]) =>
    rules
      .filter((r) => path.startsWith(r.replace(/\*.*$/, '').replace(/\$$/, '')))
      .reduce((n, r) => Math.max(n, r.length), -1);
  return longest(disallow) > longest(allow);
}

const slugTitle = (path: string) =>
  (path.split('/').filter(Boolean).at(-1) ?? '')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

/** The links of an index page that are posts, in page order (newest first is the norm). */
export function parseHtmlLinks(html: string, config: HtmlLinksConfig, now: Date): FeedItem[] {
  const pattern = new RegExp(config.linkPattern);
  const base = new URL(config.url);
  const seen = new Set<string>();
  const out: FeedItem[] = [];
  for (const m of html.matchAll(/<a\s[^>]*?href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let url: URL;
    try {
      url = new URL(m[1]!, base);
    } catch {
      continue;
    }
    if (url.origin !== base.origin || url.href === base.href) continue;
    const path = url.pathname + url.search;
    if (!pattern.test(path)) continue;
    const key = url.origin + url.pathname.replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    const text = htmlToText(m[2]!).replace(/\s+/g, ' ').trim();
    const dated = /(\d{4}-\d{2}-\d{2})/.exec(url.pathname)?.[1];
    out.push({
      source: 'html_links',
      id: key,
      url: url.origin + url.pathname,
      title: (text.length >= 12 ? text : slugTitle(url.pathname)).slice(0, 200),
      text: null,
      author: null,
      publishedAt: dated ? new Date(`${dated}T00:00:00Z`) : null,
      discoveredAt: now,
      tags: [],
      metadata: { ...config.metadata },
    });
    if (out.length >= (config.limit ?? 15)) break;
  }
  return out;
}

/**
 * The robots.txt text to obey for an origin, per RFC 9309: a 4xx means no rules (allowed); a
 * 5xx or an unreachable server means "assume complete disallow", so this throws instead of
 * crawling blind.
 */
export async function fetchRobots(
  fetchFn: typeof fetch,
  origin: string,
  options: FetchFeedOptions,
): Promise<string> {
  try {
    const { text } = await fetchSafeBody(fetchFn, `${origin}/robots.txt`, {
      timeoutMs: 10_000,
      maxBytes: 100_000,
      ...options.fetchOptions,
      headers: { 'user-agent': crawlerUserAgent(options.contact) },
    });
    return text;
  } catch (error) {
    if (
      error instanceof SafeFetchError &&
      error.status !== undefined &&
      error.status >= 400 &&
      error.status < 500
    ) {
      return '';
    }
    throw new SafeFetchError(`Could not read ${origin}/robots.txt, so the site is not crawled`, {
      ...(error instanceof SafeFetchError && error.status !== undefined
        ? { status: error.status }
        : {}),
      cause: error,
    });
  }
}

/** Reads an index page (after checking robots.txt) and returns its post links. */
export async function fetchHtmlLinks(
  fetchFn: typeof fetch,
  config: HtmlLinksConfig,
  options: FetchFeedOptions,
): Promise<FeedItem[]> {
  if (!isFetchableUrl(config.url)) throw new SafeFetchError(`Page URL not allowed: ${config.url}`);
  const target = new URL(config.url);
  const robots = await fetchRobots(fetchFn, target.origin, options);
  if (robotsDisallows(robots, target.pathname + target.search))
    throw new SafeFetchError(
      `${target.origin} robots.txt asks crawlers not to read ${target.pathname}`,
    );
  const { text } = await fetchSafeBody(fetchFn, config.url, {
    timeoutMs: 15_000,
    maxBytes: 1_000_000,
    ...options.fetchOptions,
    headers: { 'user-agent': crawlerUserAgent(options.contact), accept: 'text/html' },
  });
  return parseHtmlLinks(text, config, options.now);
}
