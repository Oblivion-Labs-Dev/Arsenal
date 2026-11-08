export interface TocItem {
  readonly id: string;
  readonly text: string;
  /** 2 for a section, 3 for a sub-section. */
  readonly level: 2 | 3;
}

/** Scroll progress as a 0..1 fraction; 0 when there is nothing to scroll. */
export function scrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  const range = scrollHeight - clientHeight;
  if (!(range > 0)) return 0;
  return Math.min(1, Math.max(0, scrollTop / range));
}

/** Joins a site origin and a path without doubled or missing slashes. Absolute URLs pass through. */
export function absoluteUrl(siteUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = siteUrl.replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** "Page · Site" unless the page title already names the site. */
export function formatPageTitle(title: string, siteName?: string): string {
  if (!siteName || title.includes(siteName)) return title;
  return `${title} · ${siteName}`;
}
