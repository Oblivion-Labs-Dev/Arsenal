import { describe, expect, it } from 'vitest';
import { THEME_INIT_SCRIPT, isSiteTheme, modeOf, themeForMode } from './theme';

describe('theme mapping', () => {
  it('maps light to ivory-graphite and dark to the remembered dark theme', () => {
    expect(themeForMode('light', 'obsidian-cyber')).toBe('ivory-graphite');
    expect(themeForMode('dark', 'obsidian-cyber')).toBe('obsidian-cyber');
    expect(themeForMode('dark', 'ivory-graphite')).toBe('deep-forge');
    expect(themeForMode('dark', 'nonsense')).toBe('deep-forge');
    expect(themeForMode('dark', null)).toBe('deep-forge');
  });

  it('knows which themes are light', () => {
    expect(modeOf('ivory-graphite')).toBe('light');
    expect(modeOf('deep-forge')).toBe('dark');
    expect(isSiteTheme('light')).toBe(false);
  });

  it('pre-paint script applies only known themes', () => {
    const run = (stored: string | null) => {
      const attrs: Record<string, string> = { 'data-theme': 'deep-forge' };
      const fn = new Function('localStorage', 'document', THEME_INIT_SCRIPT);
      fn(
        { getItem: () => stored },
        { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
      );
      return attrs['data-theme'];
    };
    expect(run('ivory-graphite')).toBe('ivory-graphite');
    expect(run('<script>')).toBe('deep-forge');
    expect(run(null)).toBe('deep-forge');
  });
});
