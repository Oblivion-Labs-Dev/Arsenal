'use client';

import { useEffect } from 'react';
import { absoluteUrl, formatPageTitle } from './reading';

export interface SeoProps {
  title: string;
  description: string;
  /** Site name appended to the title ("Title · Site") and used in social cards. */
  siteName?: string;
  /** Origin used for canonical and og:url, e.g. "https://example.com". */
  siteUrl: string;
  /** Page path, e.g. "/blog/post". Default "/". */
  path?: string;
  noIndex?: boolean;
  /** Social card image; relative paths are resolved against `siteUrl`. */
  image?: string;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Client-side head tags for single-page apps: title, description, robots, canonical, Open Graph
 * and Twitter cards. Frameworks with their own metadata API (Next.js `metadata`) should use that.
 */
export function Seo({
  title,
  description,
  siteName,
  siteUrl,
  path = '/',
  noIndex,
  image,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = formatPageTitle(title, siteName);
    const url = absoluteUrl(siteUrl, path);
    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:type', 'website');
    if (siteName) upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    if (image) {
      const src = absoluteUrl(siteUrl, image);
      upsertMeta('property', 'og:image', src);
      upsertMeta('name', 'twitter:image', src);
    }
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [title, description, siteName, siteUrl, path, noIndex, image]);

  return null;
}
