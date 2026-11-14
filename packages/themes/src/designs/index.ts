/**
 * Opt-in design token skins from the amsborse.github.io redesign (`src/styles/designs/*.css`).
 * Each skin is a CSS file scoped to `[data-design="<id>"]`; this module only describes them and
 * builds the attributes that switch them on. Lift-and-shift: copy this file and the .css files.
 */
export type DesignSkinId = 'blueprint' | 'broadsheet';
export type DesignSkinMode = 'light' | 'dark';

export interface DesignTokenSkin {
  id: DesignSkinId;
  label: string;
  /** Mode the bare `[data-design]` block defines. */
  defaultMode: DesignSkinMode;
  /** CSS entry point: `@arsenal/themes/designs/<id>.css`. */
  cssImport: string;
  fonts: { sans: string; display: string; mono?: string };
  radius: string;
  accent: Record<DesignSkinMode, string>;
  background: Record<DesignSkinMode, string>;
}

export const DESIGN_TOKEN_SKINS: Readonly<Record<DesignSkinId, DesignTokenSkin>> = {
  blueprint: {
    id: 'blueprint',
    label: 'Blueprint',
    defaultMode: 'dark',
    cssImport: '@arsenal/themes/designs/blueprint.css',
    fonts: {
      sans: '"Inter", "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
      display: 'var(--font-sans)',
      mono: 'ui-monospace, "Cascadia Code", "SF Mono", Consolas, monospace',
    },
    radius: '2px',
    accent: { dark: '#46c8ea', light: '#0b5f8a' },
    background: { dark: '#0a1626', light: '#eef2f4' },
  },
  broadsheet: {
    id: 'broadsheet',
    label: 'Broadsheet',
    defaultMode: 'light',
    cssImport: '@arsenal/themes/designs/broadsheet.css',
    fonts: {
      sans: '"Franklin Gothic Medium", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
      display:
        'Didot, "Bodoni MT", "Bodoni 72", "Playfair Display", "Iowan Old Style", Georgia, serif',
    },
    radius: '0px',
    accent: { light: '#b9311d', dark: '#ff6a4d' },
    background: { light: '#f1ece1', dark: '#141312' },
  },
};

export function isDesignSkinId(value: unknown): value is DesignSkinId {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(DESIGN_TOKEN_SKINS, value)
  );
}

/** Attributes to spread on <html> or a container to switch a skin (and optionally its mode) on. */
export function designSkinAttributes(
  id: string,
  mode?: DesignSkinMode,
): { 'data-design': DesignSkinId; 'data-theme'?: DesignSkinMode } {
  if (!isDesignSkinId(id)) {
    throw new TypeError(
      `designSkinAttributes: unknown design "${id}" (expected ${Object.keys(DESIGN_TOKEN_SKINS).join(', ')})`,
    );
  }
  if (mode !== undefined && mode !== 'light' && mode !== 'dark') {
    throw new TypeError(`designSkinAttributes: mode must be "light" or "dark"`);
  }
  return mode ? { 'data-design': id, 'data-theme': mode } : { 'data-design': id };
}

/**
 * Selectors the redesign's *full* skins style beyond tokens. Not shipped here; listed so a
 * product can map its own components onto them when porting a full skin.
 */
export const DESIGN_SKIN_SITE_SELECTORS: readonly string[] = [
  '.site-header',
  '.site-footer',
  '.site-brand__*',
  '.nav-item',
  '.chapter-title / .chapter-lede / .chapter-eyebrow',
  '.page-stage*',
  '.hero-section / .hero-copy / .hero-heading / .hero-body / .hero-primary-cta / .hero-proof-strip',
  '.editorial-card / .hub-card-enter',
  '.project-case* / .study',
  '.showcase-chapter*',
  '.essays / .essay*',
  '.about-content / .about-connect-row',
  '.chapter-rail__*',
  '.sky / .sky-field / .cosmic-background / .page-depth',
  '.article-reading__header / .article-cover',
  'main h2',
  'body::before / body::after',
];

export {
  createDesignRegistry,
  type DesignEntry,
  type DesignHooks,
  type DesignRegistry,
  type DesignRegistryOptions,
} from './registry';
