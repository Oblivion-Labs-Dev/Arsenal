import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DESIGN_TOKEN_SKINS,
  designSkinAttributes,
  isDesignSkinId,
  type DesignSkinId,
  type DesignSkinMode,
} from './index';

const css = (id: DesignSkinId) =>
  readFileSync(fileURLToPath(new URL(`./${id}.css`, import.meta.url)), 'utf8');

/** Map of selector-group → declared properties → values. */
function blocks(source: string): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  const body = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of body.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const props = new Map<string, string>();
    for (const decl of match[2].split(';')) {
      const at = decl.indexOf(':');
      if (at > 0)
        props.set(
          decl.slice(0, at).trim(),
          decl
            .slice(at + 1)
            .replace(/\s+/g, ' ')
            .trim(),
        );
    }
    out.set(match[1].replace(/\s+/g, ' ').trim(), props);
  }
  return out;
}

const other = (mode: DesignSkinMode): DesignSkinMode => (mode === 'light' ? 'dark' : 'light');

describe.each(Object.values(DESIGN_TOKEN_SKINS))('$id token skin', (skin) => {
  const parsed = blocks(css(skin.id));
  const base = parsed.get(`[data-design="${skin.id}"]`);
  const alt = other(skin.defaultMode);
  const variant = parsed.get(
    `[data-design="${skin.id}"][data-theme="${alt}"], [data-theme="${alt}"] [data-design="${skin.id}"]`,
  );

  it('is opt-in only: two scoped blocks, no global :root rules', () => {
    expect(parsed.size).toBe(2);
    expect(base).toBeDefined();
    expect(variant).toBeDefined();
    expect(css(skin.id)).not.toMatch(/:root|^\s*body|^\s*html/m);
  });

  it('every token the other mode overrides is also defined by the default mode', () => {
    for (const prop of variant!.keys()) expect(base!.has(prop), prop).toBe(true);
  });

  it('matches the metadata (colours, fonts, radius, colour-scheme)', () => {
    expect(base!.get('color-scheme')).toBe(skin.defaultMode);
    expect(variant!.get('color-scheme')).toBe(alt);
    expect(base!.get('--color-accent')).toBe(skin.accent[skin.defaultMode]);
    expect(variant!.get('--color-accent')).toBe(skin.accent[alt]);
    expect(base!.get('--color-bg')).toBe(skin.background[skin.defaultMode]);
    expect(variant!.get('--color-bg')).toBe(skin.background[alt]);
    expect(base!.get('--font-sans')).toBe(skin.fonts.sans);
    expect(base!.get('--font-display')).toBe(skin.fonts.display);
    if (skin.fonts.mono) expect(base!.get('--font-mono')).toBe(skin.fonts.mono);
    expect(base!.get('--radius-md')).toBe(skin.radius);
  });
});

describe('designSkinAttributes', () => {
  it('builds the switching attributes', () => {
    expect(designSkinAttributes('blueprint')).toEqual({ 'data-design': 'blueprint' });
    expect(designSkinAttributes('broadsheet', 'dark')).toEqual({
      'data-design': 'broadsheet',
      'data-theme': 'dark',
    });
  });
  it('rejects unknown designs and modes', () => {
    expect(() => designSkinAttributes('editorial')).toThrow(/unknown design "editorial"/);
    expect(() => designSkinAttributes('toString')).toThrow(TypeError);
    expect(() => designSkinAttributes('blueprint', 'sepia' as DesignSkinMode)).toThrow(TypeError);
    expect(isDesignSkinId(42)).toBe(false);
  });
});
