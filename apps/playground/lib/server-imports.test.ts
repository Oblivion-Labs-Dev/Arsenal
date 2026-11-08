import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/**
 * `@arsenal/ui` ships with a 'use client' banner, so in a server module its exports are client
 * references: `UI_COMPONENT_CATALOG.map` throws. Server code reads data from `@arsenal/ui/catalog`.
 */
describe('server modules', () => {
  it('never import runtime values from the client-only @arsenal/ui barrel', () => {
    const offenders = [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'lib'))]
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        if (/^\s*['"]use client['"]/.test(source)) return false;
        return /import\s+(?!type\b)[^;]*?from\s+['"]@arsenal\/ui['"]/.test(source);
      })
      .map((file) =>
        file
          .slice(ROOT.length + 1)
          .split('\\')
          .join('/'),
      );
    expect(offenders).toEqual([]);
  });
});
