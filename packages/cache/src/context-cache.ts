import { arsenalPath, readJsonFile, writeJsonFile } from "@arsenal/core";

export type CacheKind = "ast" | "summary" | "embedding" | "graph" | "compiled-context";

export interface CacheEntry {
  key: string;
  kind: CacheKind;
  hash: string;
  updatedAt: string;
}

export class ContextCache {
  constructor(private repoRoot: string) {}

  private hashesPath(): string {
    return arsenalPath(this.repoRoot, "cache/hashes.json");
  }

  getHash(filePath: string): string | undefined {
    const hashes = readJsonFile<Record<string, string>>(this.hashesPath()) ?? {};
    return hashes[filePath];
  }

  setHash(filePath: string, hash: string): void {
    const hashes = readJsonFile<Record<string, string>>(this.hashesPath()) ?? {};
    hashes[filePath] = hash;
    writeJsonFile(this.hashesPath(), hashes);
  }

  isStale(filePath: string, currentHash: string): boolean {
    const cached = this.getHash(filePath);
    return !cached || cached !== currentHash;
  }

  getStalePaths(paths: { path: string; hash: string }[]): string[] {
    return paths.filter((p) => this.isStale(p.path, p.hash)).map((p) => p.path);
  }

  invalidate(filePaths: string[]): void {
    const hashes = readJsonFile<Record<string, string>>(this.hashesPath()) ?? {};
    for (const p of filePaths) delete hashes[p];
    writeJsonFile(this.hashesPath(), hashes);
  }
}
