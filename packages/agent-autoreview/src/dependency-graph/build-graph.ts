import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import type { AutoreviewConfig } from "../config/defaults.js";

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;

const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"];

export interface DependencyGraph {
  forward: Map<string, Set<string>>;
  reverse: Map<string, Set<string>>;
  files: Set<string>;
}

function toPosix(path: string): string {
  return path.replace(/\\/g, "/");
}

function shouldStop(path: string, config: AutoreviewConfig): boolean {
  const posix = toPosix(path);
  return config.stopDependencyPatterns.some(
    (pattern) => posix.includes(pattern) || posix.startsWith(pattern),
  );
}

function resolveImport(fromFile: string, spec: string, cwd: string): string | null {
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null;
  const base = resolve(dirname(fromFile), spec);
  const candidates = [
    base,
    ...SOURCE_EXTS.map((ext) => base + ext),
    ...SOURCE_EXTS.map((ext) => join(base, `index${ext}`)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return toPosix(relative(cwd, candidate));
    }
  }
  return null;
}

function extractImports(filePath: string, cwd: string): string[] {
  const abs = resolve(cwd, filePath);
  if (!existsSync(abs)) return [];
  const content = readFileSync(abs, "utf8");
  const imports: string[] = [];
  for (const match of content.matchAll(IMPORT_RE)) {
    const spec = match[1] ?? match[2];
    if (!spec) continue;
    const resolved = resolveImport(abs, spec, cwd);
    if (resolved) imports.push(resolved);
  }
  return imports;
}

export function buildDependencyGraph(
  seeds: string[],
  cwd: string,
  config: AutoreviewConfig,
  maxDepth: number,
): DependencyGraph {
  const forward = new Map<string, Set<string>>();
  const reverse = new Map<string, Set<string>>();
  const files = new Set<string>();
  const queue: Array<{ file: string; depth: number }> = seeds.map((file) => ({
    file: toPosix(file),
    depth: 0,
  }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (visited.has(current.file) || current.depth > maxDepth) continue;
    if (shouldStop(current.file, config)) continue;
    visited.add(current.file);
    files.add(current.file);

    if (!forward.has(current.file)) forward.set(current.file, new Set());
    if (current.depth >= maxDepth) continue;

    const imports = extractImports(current.file, cwd);
    for (const imported of imports) {
      if (shouldStop(imported, config)) continue;
      forward.get(current.file)?.add(imported);
      if (!reverse.has(imported)) reverse.set(imported, new Set());
      reverse.get(imported)?.add(current.file);
      if (!visited.has(imported)) {
        queue.push({ file: imported, depth: current.depth + 1 });
      }
    }
  }

  return { forward, reverse, files };
}

export function findReverseDependents(
  seeds: string[],
  cwd: string,
  config: AutoreviewConfig,
  maxDepth: number,
  rootDirs: string[] = ["src", "app", "pages", "components"],
): Map<string, Set<string>> {
  const reverse = new Map<string, Set<string>>();
  const normalizedSeeds = new Set(seeds.map(toPosix));

  // Bounded scan of likely source roots — not the whole repository.
  const candidates: string[] = [];
  for (const root of rootDirs) {
    const abs = join(cwd, root);
    if (!existsSync(abs)) continue;
    walkSource(abs, cwd, candidates, 400);
  }

  for (const file of candidates) {
    if (shouldStop(file, config)) continue;
    const imports = extractImports(file, cwd);
    for (const imported of imports) {
      if (!normalizedSeeds.has(imported)) continue;
      if (!reverse.has(imported)) reverse.set(imported, new Set());
      reverse.get(imported)?.add(file);
    }
  }

  // Optional one-hop expansion only up to maxDepth.
  if (maxDepth > 1) {
    const firstHop = [...reverse.values()].flatMap((set) => [...set]);
    for (const file of firstHop) {
      const imports = extractImports(file, cwd);
      for (const imported of imports) {
        if (!normalizedSeeds.has(imported) && !firstHop.includes(imported)) continue;
      }
      // Collect who imports first-hop files
      for (const candidate of candidates) {
        if (candidate === file) continue;
        const candidateImports = extractImports(candidate, cwd);
        if (candidateImports.includes(file)) {
          if (!reverse.has(file)) reverse.set(file, new Set());
          reverse.get(file)?.add(candidate);
        }
      }
    }
  }

  return reverse;
}

function walkSource(dir: string, cwd: string, out: string[], remaining: number): number {
  if (remaining <= 0) return 0;
  let left = remaining;
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return left;
  }
  for (const entry of entries) {
    if (left <= 0) break;
    if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
    const abs = join(dir, entry);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      left = walkSource(abs, cwd, out, left);
    } else if (SOURCE_EXTS.includes(extname(entry))) {
      out.push(toPosix(relative(cwd, abs)));
      left -= 1;
    }
  }
  return left;
}

export function isSourceFile(path: string): boolean {
  return SOURCE_EXTS.includes(extname(path));
}

export function isTestFile(path: string): boolean {
  const posix = toPosix(path);
  return (
    /\.(test|spec)\.[jt]sx?$/.test(posix) ||
    posix.includes("/__tests__/") ||
    posix.includes("/tests/")
  );
}

export function isStoryFile(path: string): boolean {
  return /\.stories\.[jt]sx?$/.test(toPosix(path)) || toPosix(path).includes("/stories/");
}

export function normalizeRepoPath(path: string): string {
  return toPosix(normalize(path).split(sep).join("/"));
}
