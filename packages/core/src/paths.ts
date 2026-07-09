import { join } from "path";

export const ARSENAL_DIR = ".arsenal";

export function arsenalPath(repoRoot: string, ...segments: string[]): string {
  return join(repoRoot, ARSENAL_DIR, ...segments);
}

export function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

export function relativeFromRoot(repoRoot: string, filePath: string): string {
  return normalizePath(filePath.startsWith(repoRoot) ? filePath.slice(repoRoot.length + 1) : filePath);
}

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 2);
}

export function scoreText(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) score += lower.includes(term) ? 1 : 0;
  return score;
}

export function generateId(prefix = "ars"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
