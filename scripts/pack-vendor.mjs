// Packs built Arsenal packages as standalone tarballs another repo can vendor
// (`"@amsborse/arsenal-fx": "file:vendor/amsborse-arsenal-fx-0.1.0.tgz"`).
//
//   node scripts/pack-vendor.mjs <output-dir> [package ...]     (default: motion fx)
//
// Each `@arsenal/<name>` becomes `@amsborse/arsenal-<name>`; workspace dependencies between the
// packed packages are rewritten to those names in package.json, the JS and the type declarations.
// Run `pnpm --filter @arsenal/motion --filter @arsenal/fx build` first: a missing dist fails loudly.
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [outArg, ...names] = process.argv.slice(2);
if (!outArg) {
  console.error('usage: node scripts/pack-vendor.mjs <output-dir> [package ...]');
  process.exit(1);
}
const outDir = resolve(outArg);
const packages = names.length ? names : ['motion', 'fx'];
const vendorName = (name) => `@amsborse/arsenal-${name}`;

const rewriteImports = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) rewriteImports(path);
    else if (/\.(js|d\.ts)$/.test(entry)) {
      const src = readFileSync(path, 'utf8');
      const out = src.replace(/(["'])@arsenal\/([a-z-]+)\1/g, (match, quote, dep) => {
        if (!packages.includes(dep)) {
          throw new Error(`${path} imports @arsenal/${dep}, which is not being packed`);
        }
        return `${quote}${vendorName(dep)}${quote}`;
      });
      if (out !== src) writeFileSync(path, out);
    }
  }
};

mkdirSync(outDir, { recursive: true });
const stage = mkdtempSync(join(tmpdir(), 'arsenal-pack-'));
try {
  for (const name of packages) {
    const pkgDir = join(root, 'packages', name);
    const dist = join(pkgDir, 'dist');
    if (!existsSync(join(dist, 'index.js'))) {
      throw new Error(`packages/${name}/dist is missing: build @arsenal/${name} first`);
    }
    const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
    const dependencies = {};
    for (const [dep, range] of Object.entries(manifest.dependencies ?? {})) {
      const local = dep.startsWith('@arsenal/') ? dep.slice('@arsenal/'.length) : null;
      if (!local) dependencies[dep] = range;
      else if (!packages.includes(local)) {
        throw new Error(`@arsenal/${name} depends on ${dep}, which is not being packed`);
      }
    }
    // Sibling Arsenal packages become peers: the consuming repo vendors each tarball itself.
    const peerDependencies = { ...manifest.peerDependencies };
    for (const dep of Object.keys(manifest.dependencies ?? {})) {
      if (dep.startsWith('@arsenal/')) {
        peerDependencies[vendorName(dep.slice('@arsenal/'.length))] = manifest.version;
      }
    }
    const target = join(stage, name);
    cpSync(dist, join(target, 'dist'), { recursive: true });
    rewriteImports(join(target, 'dist'));
    writeFileSync(
      join(target, 'package.json'),
      `${JSON.stringify(
        {
          name: vendorName(name),
          version: manifest.version,
          description: manifest.description,
          type: manifest.type,
          sideEffects: manifest.sideEffects,
          main: manifest.main,
          types: manifest.types,
          exports: manifest.exports,
          files: ['dist'],
          dependencies,
          peerDependencies,
          peerDependenciesMeta: manifest.peerDependenciesMeta,
        },
        null,
        2,
      )}\n`,
    );
    const packed = execFileSync('npm', ['pack', '--pack-destination', outDir], {
      cwd: target,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
      .trim()
      .split(/\r?\n/)
      .pop();
    console.log(`${vendorName(name)} -> ${join(outDir, packed)}`);
  }
} finally {
  rmSync(stage, { recursive: true, force: true });
}
