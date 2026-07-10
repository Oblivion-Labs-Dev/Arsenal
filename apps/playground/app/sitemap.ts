import { FEATURE_AREAS } from '@/lib/feature-catalog';
import type { MetadataRoute } from 'next';

const baseUrl = 'https://arsenal.oblivionlabs.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['/', '/components', '/context', '/coming-soon'];
  const featureRoutes = FEATURE_AREAS.map((feature) => `/features/${feature.slug}`);
  const lastModified = new Date();

  return [...staticRoutes, ...featureRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.75,
  }));
}
