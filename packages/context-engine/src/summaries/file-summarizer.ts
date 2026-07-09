import type { FileSummary } from "../schemas/file-summary.schema.js";
import type { ScannedFile } from "../core/repo-scanner.js";
import type { DependencyGraph } from "../indexers/dependency-indexer.js";
import type { TestIndex } from "../indexers/test-indexer.js";
import { extractAstSymbols, hasSideEffects } from "../indexers/ast-indexer.js";
import { extractImports } from "../indexers/import-indexer.js";

export function summarizeFile(
  file: ScannedFile,
  dependencyGraph: DependencyGraph,
  testIndex: TestIndex,
): FileSummary {
  const content = file.content ?? "";
  const symbols = extractAstSymbols(content);
  const imports = extractImports(content);
  const exports = symbols.filter((s) => s.exported).map((s) => s.name);
  const dependsOn = dependencyGraph.edges.filter((e) => e.from === file.path).map((e) => e.to);
  const usedBy = dependencyGraph.dependents[file.path] ?? [];
  const tests = testIndex.tests.filter((t) => t.targetFile === file.path).map((t) => t.testFile);

  const risks: string[] = [];
  if (file.size > 20_000) risks.push("large file — prefer summaries over full read");
  if (hasSideEffects(content).length > 2) risks.push("multiple side effects");

  return {
    path: file.path,
    purpose: inferPurpose(file.path, symbols, imports),
    exports,
    imports,
    keySymbols: symbols.map((s) => s.name).slice(0, 12),
    sideEffects: hasSideEffects(content),
    dependsOn,
    usedBy,
    tests,
    risks,
    lastHash: file.hash,
  };
}

function inferPurpose(
  path: string,
  symbols: { name: string; kind: string }[],
  imports: string[],
): string {
  const basename = path.split("/").pop() ?? path;
  if (path.includes("test") || path.includes("spec")) {
    return `Tests for related source modules (${basename})`;
  }
  if (symbols.some((s) => s.kind === "component")) {
    return `React/UI component module (${basename})`;
  }
  if (path.includes("api") || path.includes("route")) {
    return `API/route handler (${basename})`;
  }
  if (imports.length === 0 && symbols.length <= 2) {
    return `Utility or entry module (${basename})`;
  }
  const main = symbols[0]?.name;
  return main ? `Defines ${main} and related symbols in ${basename}` : `Source module (${basename})`;
}
