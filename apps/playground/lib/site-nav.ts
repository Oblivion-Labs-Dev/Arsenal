import { UI_COMPONENT_CATALOG } from '@arsenal/ui/catalog';
import { FEATURE_AREAS } from './feature-catalog';
import { THEMES, THEME_LABELS, type SiteTheme } from './theme';

export interface NavItem {
  href: string;
  label: string;
  hint: string;
}

/** The five destinations. Order is the header order. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', hint: 'What Arsenal is and the best of it' },
  { href: '/components', label: 'Components', hint: 'Find, see and copy a component' },
  { href: '/modules', label: 'Modules', hint: 'Which package to import for what' },
  { href: '/labs', label: 'Labs', hint: 'Prototypes, experiments and what is next' },
  { href: '/context', label: 'Context', hint: 'Live token and context dashboard' },
];

export interface LabItem {
  href: string;
  title: string;
  description: string;
  tag: string;
}

/** Prototypes keep their own URLs (they have their own tests and styles) and are listed in Labs. */
export const LAB_ITEMS: LabItem[] = [
  {
    href: '/task-card-prototype',
    title: 'Precision task card',
    description: 'A production-grade task card with clay, artisan and expanded variants.',
    tag: 'Card system',
  },
  {
    href: '/task-card-prototype/vault',
    title: 'Card collection vault',
    description: 'Collect, preview and equip cosmetic task-card themes earned as rewards.',
    tag: 'Rewards',
  },
  {
    href: '/metrics-prototype',
    title: 'Metrics lab',
    description: 'An interactive dimensional analytics dashboard with linked charts.',
    tag: 'Analytics',
  },
];

/** Which header item is active for a pathname. Prototype routes belong to Labs. */
export function activeNavHref(pathname: string): string | null {
  if (pathname === '/') return '/';
  if (LAB_ITEMS.some((lab) => pathname === lab.href || pathname.startsWith(`${lab.href}/`)))
    return '/labs';
  const match = NAV_ITEMS.filter((item) => item.href !== '/').find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.href ?? null;
}

export type PaletteGroup = 'Pages' | 'Components' | 'Modules' | 'Labs' | 'Theme';

export interface PaletteItem {
  id: string;
  group: PaletteGroup;
  title: string;
  subtitle: string;
  href?: string;
  theme?: SiteTheme;
  keywords: string;
}

export function buildPaletteItems(): PaletteItem[] {
  const pages: PaletteItem[] = NAV_ITEMS.map((item) => ({
    id: `page:${item.href}`,
    group: 'Pages',
    title: item.label,
    subtitle: item.hint,
    href: item.href,
    keywords: item.hint,
  }));
  const components: PaletteItem[] = UI_COMPONENT_CATALOG.map((entry) => ({
    id: `component:${entry.id}`,
    group: 'Components',
    title: entry.name,
    subtitle: entry.description,
    href: `/components/${entry.id}`,
    keywords: `${entry.id} ${entry.category}`,
  }));
  const modules: PaletteItem[] = FEATURE_AREAS.map((feature) => ({
    id: `module:${feature.slug}`,
    group: 'Modules',
    title: feature.title,
    subtitle: feature.tagline,
    href: `/modules/${feature.slug}`,
    keywords: feature.packages.join(' '),
  }));
  const labs: PaletteItem[] = [
    ...LAB_ITEMS.map((lab) => ({
      id: `lab:${lab.href}`,
      group: 'Labs' as const,
      title: lab.title,
      subtitle: lab.description,
      href: lab.href,
      keywords: lab.tag,
    })),
    {
      id: 'lab:next',
      group: 'Labs',
      title: 'Next on the roadmap',
      subtitle: 'Planned modules that are not built yet',
      href: '/labs#next',
      keywords: 'coming soon roadmap future',
    },
  ];
  const themes: PaletteItem[] = THEMES.map((theme) => ({
    id: `theme:${theme}`,
    group: 'Theme',
    title: `Theme: ${THEME_LABELS[theme]}`,
    subtitle: 'Switch the site theme',
    theme,
    keywords: 'theme light dark mode appearance',
  }));
  return [...pages, ...components, ...modules, ...labs, ...themes];
}

/** Ranked search: title prefix > title word > title contains > subtitle/keywords. */
export function searchPalette(items: PaletteItem[], query: string, limit = 40): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.filter((item) => item.group !== 'Components').slice(0, limit);
  const scored: { item: PaletteItem; score: number }[] = [];
  for (const item of items) {
    const title = item.title.toLowerCase();
    let score = 0;
    if (title.startsWith(q)) score = 4;
    else if (title.split(/[\s:-]+/).some((word) => word.startsWith(q))) score = 3;
    else if (title.includes(q)) score = 2;
    else if (`${item.subtitle} ${item.keywords}`.toLowerCase().includes(q)) score = 1;
    if (score) scored.push({ item, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
