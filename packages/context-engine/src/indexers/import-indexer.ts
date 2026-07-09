const IMPORT_RE =
  /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
const REQUIRE_RE = /require\(['"]([^'"]+)['"]\)/g;
const EXPORT_FROM_RE = /export\s+.*\s+from\s+['"]([^'"]+)['"]/g;

export function extractImports(content: string): string[] {
  const imports = new Set<string>();
  for (const re of [IMPORT_RE, REQUIRE_RE, EXPORT_FROM_RE]) {
    for (const match of content.matchAll(re)) {
      if (match[1]) imports.add(match[1]);
    }
  }
  return [...imports];
}

export function resolveImport(importPath: string, fromFile: string, allFiles: string[]): string | null {
  if (!importPath.startsWith(".") && !importPath.startsWith("@/")) {
    return null;
  }

  let resolved = importPath;
  if (importPath.startsWith("@/")) {
    resolved = `src/${importPath.slice(2)}`;
  } else {
    const baseParts = fromFile.split("/").slice(0, -1);
    const importParts = importPath.split("/");
    const combined: string[] = [...baseParts];
    for (const part of importParts) {
      if (part === ".") continue;
      if (part === "..") combined.pop();
      else combined.push(part);
    }
    resolved = combined.join("/");
  }

  resolved = resolved.replace(/\.(js|jsx|mjs|cjs|ts|tsx)$/, "");

  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    `${resolved}.js`,
    `${resolved}.jsx`,
    `${resolved}/index.ts`,
    `${resolved}/index.tsx`,
  ];

  for (const candidate of candidates) {
    if (allFiles.includes(candidate)) return candidate;
  }
  return null;
}

export interface ImportIndex {
  version: string;
  generatedAt: string;
  imports: Record<string, string[]>;
  resolved: Record<string, string[]>;
}

export function buildImportIndex(
  files: { path: string; content?: string }[],
  allPaths: string[],
): ImportIndex {
  const imports: Record<string, string[]> = {};
  const resolved: Record<string, string[]> = {};

  for (const file of files) {
    if (!file.content) continue;
    const fileImports = extractImports(file.content);
    imports[file.path] = fileImports;
    resolved[file.path] = fileImports
      .map((imp) => resolveImport(imp, file.path, allPaths))
      .filter((p): p is string => p !== null);
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    imports,
    resolved,
  };
}
