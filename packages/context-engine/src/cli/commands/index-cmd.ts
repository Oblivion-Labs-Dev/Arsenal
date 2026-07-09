import type { ArsenalConfig } from "../../schemas/arsenal-config.schema.js";
import { loadConfig } from "../../core/init-workspace.js";
import { arsenalPath } from "../../core/paths.js";
import { readJsonFile, writeJsonFile } from "../../core/file-io.js";
import { scanRepo, buildRepoMapStats } from "../../core/repo-scanner.js";
import { RepoMapSchema } from "../../schemas/repo-map.schema.js";
import { buildSymbolIndex } from "../../indexers/symbol-indexer.js";
import { buildImportIndex } from "../../indexers/import-indexer.js";
import { buildDependencyGraph } from "../../indexers/dependency-indexer.js";

export interface IndexResult {
  repoMapPath: string;
  fileIndexPath: string;
  symbolIndexPath: string;
  dependencyGraphPath: string;
  scanned: number;
  skipped: number;
}

export function runIndex(repoRoot: string, config?: ArsenalConfig): IndexResult {
  const cfg = config ?? loadConfig(repoRoot);
  const hashesPath = arsenalPath(repoRoot, "cache/hashes.json");
  const previousHashes = readJsonFile<Record<string, string>>(hashesPath) ?? {};

  const scan = scanRepo(repoRoot, cfg, { includeContent: true, previousHashes });
  const allPaths = scan.files.map((f) => f.path);

  const repoMap = RepoMapSchema.parse({
    version: "1.0",
    generatedAt: new Date().toISOString(),
    root: repoRoot,
    projectType: scan.projectType,
    stats: buildRepoMapStats(scan.files),
    modules: scan.modules,
    files: scan.files.map(({ absolutePath: _, content: __, ...rest }) => rest),
  });

  const fileIndex = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    files: scan.files.map((f) => ({
      path: f.path,
      kind: f.kind,
      hash: f.hash,
      size: f.size,
      module: f.module,
    })),
  };

  const symbolIndex = buildSymbolIndex(scan.files);
  const importIndex = buildImportIndex(scan.files, allPaths);
  const dependencyGraph = buildDependencyGraph(importIndex);

  const repoMapPath = arsenalPath(repoRoot, "repo-map.json");
  const fileIndexPath = arsenalPath(repoRoot, "file-index.json");
  const symbolIndexPath = arsenalPath(repoRoot, "symbol-index.json");
  const dependencyGraphPath = arsenalPath(repoRoot, "dependency-graph.json");

  writeJsonFile(repoMapPath, repoMap);
  writeJsonFile(fileIndexPath, fileIndex);
  writeJsonFile(symbolIndexPath, symbolIndex);
  writeJsonFile(dependencyGraphPath, dependencyGraph);

  const newHashes: Record<string, string> = { ...previousHashes };
  for (const file of scan.files) {
    newHashes[file.path] = file.hash;
  }
  writeJsonFile(hashesPath, newHashes);

  const fullScan = scanRepo(repoRoot, cfg, { includeContent: false });
  const skipped = Math.max(0, fullScan.files.length - scan.files.length);

  return {
    repoMapPath,
    fileIndexPath,
    symbolIndexPath,
    dependencyGraphPath,
    scanned: scan.files.length,
    skipped,
  };
}
