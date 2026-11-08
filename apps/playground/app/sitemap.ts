import { UI_COMPONENT_CATALOG } from '@arsenal/ui/catalog';
import type { MetadataRoute } from 'next';
import { FEATURE_AREAS } from '@/lib/feature-catalog';
import { LAB_ITEMS, NAV_ITEMS } from '@/lib/site-nav';

const baseUrl = 'https://arsenal.oblivionlabs.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    ...NAV_ITEMS.map((item) => item.href),
    ...UI_COMPONENT_CATALOG.map((entry) => `/components/${entry.id}`),
    ...FEATURE_AREAS.map((feature) => `/modules/${feature.slug}`),
    ...LAB_ITEMS.map((lab) => lab.href),
  ];
  const lastModified = new Date();
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.75,
  }));
}
