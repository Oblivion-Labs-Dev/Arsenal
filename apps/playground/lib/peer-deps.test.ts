import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// The playground's declared React must satisfy the peer ranges of the 3D stack it installs,
// otherwise every install warns and the app type-checks against a React it does not run on.
const require = createRequire(import.meta.url);
const readPkg = (name: string) =>
  JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8')) as {
    version: string;
    peerDependencies?: Record<string, string>;
  };

const caretMajors = (range: string) =>
  range.split('||').map((part) =>
    Number(
      part
        .trim()
        .replace(/^[\^~>=]+/, '')
        .split('.')[0],
    ),
  );

describe('playground peer dependencies', () => {
  it.each(['react', 'react-dom'])('installed %s satisfies @react-three/fiber', (dep) => {
    const peer = readPkg('@react-three/fiber').peerDependencies?.[dep];
    expect(peer, `fiber declares a ${dep} peer`).toBeTruthy();
    const installedMajor = Number(readPkg(dep).version.split('.')[0]);
    expect(caretMajors(peer!)).toContain(installedMajor);
  });
});
