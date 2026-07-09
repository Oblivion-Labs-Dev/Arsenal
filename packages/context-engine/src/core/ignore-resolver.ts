import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { ArsenalConfig } from "../schemas/arsenal-config.schema.js";
import { normalizePath } from "./paths.js";

const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".arsenal/cache",
];

const LOCK_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
]);

function parseGitignore(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function patternToRegex(pattern: string): RegExp {
  let p = normalizePath(pattern);
  if (p.endsWith("/")) p = p.slice(0, -1);
  const escaped = p
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "§§")
    .replace(/\*/g, "[^/]*")
    .replace(/§§/g, ".*")
    .replace(/\?/g, ".");
  if (p.includes("/") || p.includes("*") || p.includes("?")) {
    return new RegExp(`(^|/)${escaped}($|/)`);
  }
  return new RegExp(`(^|/)${escaped}($|/)`);
}

export class IgnoreResolver {
  private patterns: RegExp[] = [];
  private exactNames = new Set<string>();

  constructor(repoRoot: string, config: ArsenalConfig) {
    const patterns = [...DEFAULT_IGNORES, ...config.ignore];
    const gitignorePath = join(repoRoot, ".gitignore");
    if (existsSync(gitignorePath)) {
      patterns.push(...parseGitignore(readFileSync(gitignorePath, "utf-8")));
    }
    for (const pattern of patterns) {
      const normalized = normalizePath(pattern).replace(/\/$/, "");
      if (normalized && !normalized.includes("/") && !normalized.includes("*") && !normalized.includes("?")) {
        this.exactNames.add(normalized);
      }
      this.patterns.push(patternToRegex(pattern));
    }
  }

  isIgnored(relativePath: string): boolean {
    const normalized = normalizePath(relativePath);
    const basename = normalized.split("/").pop() ?? normalized;

    if (LOCK_FILES.has(basename)) return true;
    if (this.exactNames.has(basename) || this.exactNames.has(normalized)) return true;

    for (const pattern of this.patterns) {
      if (pattern.test(normalized)) return true;
    }
    return false;
  }
}
