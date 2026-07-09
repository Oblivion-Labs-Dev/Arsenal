import { loadConfig } from "../../core/init-workspace.js";
import { arsenalPath } from "../../core/paths.js";
import { readJsonFile, writeJsonFile } from "../../core/file-io.js";
import type { RepoMap } from "../../schemas/repo-map.schema.js";
import type { SymbolIndex } from "../../indexers/symbol-indexer.js";
import type { DependencyGraph } from "../../indexers/dependency-indexer.js";
import { buildTestIndex } from "../../indexers/test-indexer.js";
import { buildRouteIndex } from "../../indexers/route-indexer.js";
import { buildApiIndex } from "../../indexers/api-indexer.js";
import { buildImportIndex } from "../../indexers/import-indexer.js";
import { buildKnowledgeGraph } from "../../graph/graph-builder.js";
import { scanRepo } from "../../core/repo-scanner.js";

export function runGraph(repoRoot: string) {
  const config = loadConfig(repoRoot);
  const repoMap = readJsonFile<RepoMap>(arsenalPath(repoRoot, "repo-map.json"));
  const symbolIndex = readJsonFile<SymbolIndex>(arsenalPath(repoRoot, "symbol-index.json"));
  const dependencyGraph = readJsonFile<DependencyGraph>(
    arsenalPath(repoRoot, "dependency-graph.json"),
  );

  if (!repoMap || !symbolIndex || !dependencyGraph) {
    throw new Error("Run `arsenal context index` first.");
  }

  const scan = scanRepo(repoRoot, config, { includeContent: true });
  const allPaths = scan.files.map((f) => f.path);
  const importIndex = buildImportIndex(scan.files, allPaths);
  const testIndex = buildTestIndex(scan.files);
  const routeIndex = buildRouteIndex(scan.files);
  const apiIndex = buildApiIndex(scan.files);

  const graph = buildKnowledgeGraph({
    repoRoot,
    repoMap,
    symbolIndex,
    dependencyGraph,
    testIndex,
    routeIndex,
    apiIndex,
    importIndex,
  });

  const outPath = arsenalPath(repoRoot, "knowledge-graph.json");
  writeJsonFile(outPath, graph);

  return { path: outPath, nodes: graph.nodes.length, edges: graph.edges.length };
}
