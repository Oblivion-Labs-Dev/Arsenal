import { createHash } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { ArsenalConfig } from "../schemas/arsenal-config.schema.js";
import type { RepoFileEntry } from "../schemas/repo-map.schema.js";
import { classifyFile, detectProjectType, inferModule } from "./file-classifier.js";
import { IgnoreResolver } from "./ignore-resolver.js";
import { relativeFromRoot } from "./paths.js";

export interface ScannedFile extends RepoFileEntry {
  absolutePath: string;
  content?: string;
}

export interface ScanResult {
  files: ScannedFile[];
  projectType: string;
  modules: string[];
}

export function hashContent(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function hashFile(absolutePath: string): string {
  const content = readFileSync(absolutePath);
  return hashContent(content);
}

export interface ScanOptions {
  includeContent?: boolean;
  previousHashes?: Record<string, string>;
  onlyChanged?: boolean;
}

export function scanRepo(repoRoot: string, config: ArsenalConfig, options: ScanOptions = {}): ScanResult {
  const resolver = new IgnoreResolver(repoRoot, config);
  const files: ScannedFile[] = [];
  const moduleSet = new Set<string>();

  function walk(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = join(dir, entry);
      const relativePath = relativeFromRoot(repoRoot, absolutePath);

      if (resolver.isIgnored(relativePath)) continue;

      let stat;
      try {
        stat = statSync(absolutePath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!stat.isFile()) continue;

      const hash = hashFile(absolutePath);
      if (options.onlyChanged && options.previousHashes?.[relativePath] === hash) {
        continue;
      }

      const kind = classifyFile(relativePath, config);
      const module = inferModule(relativePath, config);
      if (module) moduleSet.add(module);

      const scanned: ScannedFile = {
        path: relativePath,
        kind,
        extension: relativePath.includes(".") ? relativePath.slice(relativePath.lastIndexOf(".")) : undefined,
        size: stat.size,
        hash,
        module,
        absolutePath,
      };

      if (options.includeContent && (kind === "source" || kind === "test" || kind === "config")) {
        scanned.content = readFileSync(absolutePath, "utf-8");
      }

      files.push(scanned);
    }
  }

  walk(repoRoot);

  const relativePaths = files.map((f) => f.path);
  const projectType =
    config.projectType === "auto" ? detectProjectType(relativePaths) : config.projectType;

  return {
    files,
    projectType,
    modules: [...moduleSet].sort(),
  };
}

export function buildRepoMapStats(files: ScannedFile[]) {
  return {
    totalFiles: files.length,
    sourceFiles: files.filter((f) => f.kind === "source").length,
    testFiles: files.filter((f) => f.kind === "test").length,
    configFiles: files.filter((f) => f.kind === "config").length,
    docFiles: files.filter((f) => f.kind === "doc").length,
  };
}
