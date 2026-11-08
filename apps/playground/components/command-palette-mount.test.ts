import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx$/.test(name) && !name.endsWith('.test.tsx') ? [path] : [];
  });
}

describe('command palette', () => {
  it('is mounted exactly once, by the app providers', () => {
    const mounts = [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'components'))]
      .filter((file) => /<(CommandPalette|SiteCommandPalette)\b/.test(readFileSync(file, 'utf8')))
      .map((file) =>
        file
          .slice(ROOT.length + 1)
          .split('\\')
          .join('/'),
      );
    expect(mounts).toEqual(['components/app-providers.tsx']);
  });
});
