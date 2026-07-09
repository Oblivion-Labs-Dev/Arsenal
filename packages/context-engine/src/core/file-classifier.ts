import type { ArsenalConfig } from "../schemas/arsenal-config.schema.js";
import { normalizePath } from "./paths.js";

export type FileKind =
  | "source"
  | "test"
  | "config"
  | "doc"
  | "asset"
  | "lock"
  | "generated"
  | "other";

const SOURCE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".vue",
  ".svelte",
]);

const CONFIG_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "turbo.json",
  "vite.config.ts",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vitest.config.ts",
  "eslint.config.js",
  "pnpm-workspace.yaml",
]);

const DOC_EXTS = new Set([".md", ".mdx", ".rst", ".txt"]);

export function getExtension(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  const idx = base.lastIndexOf(".");
  return idx >= 0 ? base.slice(idx).toLowerCase() : "";
}

export function classifyFile(relativePath: string, config: ArsenalConfig): FileKind {
  const normalized = normalizePath(relativePath);
  const basename = normalized.split("/").pop() ?? normalized;
  const ext = getExtension(normalized);

  if (basename.endsWith(".lock") || basename.includes("lock.")) return "lock";

  const inTestRoot = config.testRoots.some(
    (root) => normalized.startsWith(`${root}/`) || normalized === root,
  );
  if (
    inTestRoot ||
    basename.includes(".test.") ||
    basename.includes(".spec.") ||
    normalized.includes("__tests__")
  ) {
    return "test";
  }

  if (CONFIG_NAMES.has(basename) || basename.endsWith(".config.ts") || basename.endsWith(".config.js")) {
    return "config";
  }

  const inDocs = config.docsRoots.some(
    (root) => normalized.startsWith(`${root}/`) || normalized === root,
  );
  if (inDocs || DOC_EXTS.has(ext)) return "doc";

  if (normalized.includes("/dist/") || normalized.includes("/build/") || normalized.includes("/.next/")) {
    return "generated";
  }

  if (SOURCE_EXTS.has(ext)) return "source";

  if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2"].includes(ext)) {
    return "asset";
  }

  return "other";
}

export function inferModule(relativePath: string, config: ArsenalConfig): string | undefined {
  const normalized = normalizePath(relativePath);
  for (const root of config.sourceRoots) {
    if (normalized.startsWith(`${root}/`)) {
      const rest = normalized.slice(root.length + 1);
      const parts = rest.split("/");
      return parts.length > 1 ? `${root}/${parts[0]}` : root;
    }
  }
  return undefined;
}

export function detectProjectType(files: string[]): string {
  const set = new Set(files.map((f) => normalizePath(f)));
  if ([...set].some((f) => f.includes("next.config"))) return "nextjs";
  if ([...set].some((f) => f.endsWith("vite.config.ts"))) return "vite";
  if ([...set].some((f) => f.includes("turbo.json"))) return "monorepo";
  if ([...set].some((f) => f.endsWith("package.json"))) return "node";
  return "unknown";
}
