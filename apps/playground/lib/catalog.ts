import {
  COMPONENT_CATEGORIES,
  UI_COMPONENT_CATALOG,
  type ComponentCatalogEntry,
  type ComponentCategory,
} from '@arsenal/ui/catalog';

export type CategoryFilter = ComponentCategory | 'all';

export interface CategoryCount {
  id: ComponentCategory;
  label: string;
  count: number;
}

/**
 * Categories straight from each entry's own `category` field, in the catalog's display order.
 * Empty categories are left out, so every chip leads somewhere.
 */
export function categoriesWithCounts(
  entries: readonly ComponentCatalogEntry[] = UI_COMPONENT_CATALOG,
): CategoryCount[] {
  const counts = new Map<ComponentCategory, number>();
  for (const entry of entries) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);

  const known = COMPONENT_CATEGORIES.filter((c) => counts.has(c.id)).map((c) => ({
    id: c.id,
    label: c.label,
    count: counts.get(c.id) ?? 0,
  }));
  // A category used by an entry but missing from the label list still gets a chip.
  const labelled = new Set(known.map((c) => c.id));
  const extra = [...counts.keys()]
    .filter((id) => !labelled.has(id))
    .map((id) => ({ id, label: id.replace(/-/g, ' '), count: counts.get(id) ?? 0 }));
  return [...known, ...extra];
}

export function filterEntries(
  entries: readonly ComponentCatalogEntry[],
  category: CategoryFilter,
  query: string,
): ComponentCatalogEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (category !== 'all' && entry.category !== category) return false;
    if (!q) return true;
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.category.includes(q) ||
      entry.id.includes(q)
    );
  });
}

export function getCatalogEntry(id: string): ComponentCatalogEntry | undefined {
  return UI_COMPONENT_CATALOG.find((entry) => entry.id === id);
}

/** Same-category neighbours first, then the rest of the catalog, never the entry itself. */
export function relatedEntries(entry: ComponentCatalogEntry, limit = 4): ComponentCatalogEntry[] {
  const same = UI_COMPONENT_CATALOG.filter(
    (other) => other.id !== entry.id && other.category === entry.category,
  );
  return same.slice(0, limit);
}

export function categoryLabel(id: ComponentCategory): string {
  return COMPONENT_CATEGORIES.find((c) => c.id === id)?.label ?? id.replace(/-/g, ' ');
}

/** Hand-picked live components for the home page "best of" strip. Ids must exist in the catalog. */
export const BEST_OF_IDS = [
  'score-ring',
  'kpi-card',
  'orbit-radar',
  'flip-clock',
  'donut-chart',
  'animated-tabs',
] as const;
