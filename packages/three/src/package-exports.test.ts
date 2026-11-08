import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  exports: Record<string, Record<string, string>>;
  peerDependencies: Record<string, string>;
};

describe('@arsenal/three package contract', () => {
  it('exports "." with a default condition so Next resolves it (not only import/types)', () => {
    expect(pkg.exports['.']?.default).toBe('./dist/index.js');
  });

  it('accepts React Three Fiber 9 and React 19, which the Next app router bundles', () => {
    expect(pkg.peerDependencies['@react-three/fiber']).toMatch(/\^9/);
    expect(pkg.peerDependencies.react).toMatch(/\^19/);
  });
});
