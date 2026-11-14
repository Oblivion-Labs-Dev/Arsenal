import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { UI_COMPONENT_CATALOG } from './component-catalog';

const PACKAGES = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const KIT = [
  'print-plate',
  'crosshair-cursor',
  'technical-sheet',
  'print-interactions',
  'path-packets',
  'design-token-skins',
];

describe('redesign kit catalog entries', () => {
  const entries = UI_COMPONENT_CATALOG.filter((entry) => KIT.includes(entry.id));

  it('lists every ported piece once, with unique ids across the catalog', () => {
    expect(entries.map((entry) => entry.id).sort()).toEqual([...KIT].sort());
    const ids = UI_COMPONENT_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every CSS import resolves to a package export that points at a real file', () => {
    let checked = 0;
    for (const entry of entries) {
      const imports = [
        ...`${entry.importLine}\n${entry.code}`.matchAll(
          /import "@arsenal\/([\w-]+)\/([^"]+\.css)"/g,
        ),
      ];
      for (const [, pkg, sub] of imports) {
        const dir = join(PACKAGES, pkg);
        const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
          exports: Record<string, unknown>;
        };
        const target = manifest.exports[`./${sub}`];
        expect(typeof target, `${entry.id}: @arsenal/${pkg}/${sub}`).toBe('string');
        expect(existsSync(join(dir, target as string)), `${entry.id}: ${String(target)}`).toBe(
          true,
        );
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(6);
  });
});
