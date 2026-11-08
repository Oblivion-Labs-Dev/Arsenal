/** One item discovered from a feed, an index page or a JSON API. All fields are untrusted text. */
export interface FeedItem {
  source: 'rss' | 'html_links' | 'json_api';
  /** The source's own id for the item (guid, atom id, API id), when it has one. */
  id: string | null;
  url: string;
  title: string;
  text: string | null;
  author: string | null;
  publishedAt: Date | null;
  discoveredAt: Date;
  tags: string[];
  metadata: Record<string, string>;
}
