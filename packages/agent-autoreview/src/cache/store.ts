import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface CacheKeyParts {
  kind: string;
  fileContentHashes?: string[];
  taskDescription?: string;
  route?: string;
  viewport?: string;
  interaction?: string;
  configHash?: string;
  dependencyGraphVersion?: string;
}

export class AutoreviewCache {
  constructor(private readonly root: string) {
    mkdirSync(root, { recursive: true });
  }

  key(parts: CacheKeyParts): string {
    const payload = JSON.stringify(parts);
    return createHash("sha256").update(payload).digest("hex");
  }

  get<T>(key: string): T | null {
    const path = join(this.root, `${key}.json`);
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, "utf8")) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    mkdirSync(this.root, { recursive: true });
    writeFileSync(join(this.root, `${key}.json`), JSON.stringify(value), "utf8");
  }

  invalidate(key: string): void {
    const path = join(this.root, `${key}.json`);
    if (existsSync(path)) unlinkSync(path);
  }

  invalidateByPrefix(prefix: string): number {
    if (!existsSync(this.root)) return 0;
    let count = 0;
    for (const entry of readdirSync(this.root)) {
      if (!entry.endsWith(".json")) continue;
      const abs = join(this.root, entry);
      try {
        const raw = readFileSync(abs, "utf8");
        if (raw.includes(prefix)) {
          unlinkSync(abs);
          count += 1;
        }
      } catch {
        // ignore
      }
    }
    return count;
  }

  hashFile(cwd: string, relativePath: string): string {
    const abs = join(cwd, relativePath);
    if (!existsSync(abs) || !statSync(abs).isFile()) return "missing";
    return createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
  }
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}
