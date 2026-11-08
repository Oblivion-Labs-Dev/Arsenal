// Server-safe entry: plain catalog data with no React, built without the 'use client' banner
// so Next server components, generateStaticParams and the sitemap can read it.
export {
  COMPONENT_CATEGORIES,
  UI_COMPONENT_CATALOG,
  UI_SETUP_SNIPPET,
  type ComponentCatalogEntry,
  type ComponentCategory,
} from './component-catalog';
