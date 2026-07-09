import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { loadConfig } from "../../core/init-workspace.js";
import { arsenalPath } from "../../core/paths.js";
import { readJsonFile, writeJsonFile, writeTextFile } from "../../core/file-io.js";
import { scanRepo } from "../../core/repo-scanner.js";
import type { RepoMap } from "../../schemas/repo-map.schema.js";
import type { DependencyGraph } from "../../indexers/dependency-indexer.js";
import type { TestIndex } from "../../indexers/test-indexer.js";
import { buildTestIndex } from "../../indexers/test-indexer.js";
import { summarizeFile } from "../../summaries/file-summarizer.js";
import { summarizeModule } from "../../summaries/module-summarizer.js";
import { summarizeArchitecture } from "../../summaries/architecture-summarizer.js";
import type { KnowledgeGraph } from "../../schemas/knowledge-graph.schema.js";
import type { FileSummary } from "../../schemas/file-summary.schema.js";
import { extractAstSymbols } from "../../indexers/ast-indexer.js";

export function runSummarize(repoRoot: string) {
  const config = loadConfig(repoRoot);
  const repoMap = readJsonFile<RepoMap>(arsenalPath(repoRoot, "repo-map.json"));
  const dependencyGraph = readJsonFile<DependencyGraph>(
    arsenalPath(repoRoot, "dependency-graph.json"),
  );

  if (!repoMap || !dependencyGraph) {
    throw new Error("Run `arsenal context index` first.");
  }

  const scan = scanRepo(repoRoot, config, { includeContent: true });
  const testIndex = buildTestIndex(scan.files);

  const summaries: FileSummary[] = [];
  for (const file of scan.files.filter((f) => f.kind === "source" || f.kind === "test")) {
    summaries.push(summarizeFile(file, dependencyGraph, testIndex));
  }

  const filesDir = arsenalPath(repoRoot, "summaries/files");
  for (const summary of summaries) {
    writeJsonFile(join(filesDir, `${summary.path.replace(/[\\/]/g, "__")}.json`), summary);
  }

  for (const mod of repoMap.modules) {
    writeTextFile(
      arsenalPath(repoRoot, "summaries/modules", `${mod.replace(/[\\/]/g, "__")}.md`),
      summarizeModule(mod, summaries),
    );
  }

  const graph = readJsonFile<KnowledgeGraph>(arsenalPath(repoRoot, "knowledge-graph.json"));
  writeTextFile(
    arsenalPath(repoRoot, "summaries/architecture.md"),
    summarizeArchitecture(repoMap, graph ?? { version: "1.0", generatedAt: "", nodes: [], edges: [] }),
  );

  writeTextFile(
    arsenalPath(repoRoot, "summaries/public-api.md"),
    buildPublicApiSummary(scan.files),
  );

  writeTextFile(
    arsenalPath(repoRoot, "summaries/tests.md"),
    buildTestsSummary(testIndex),
  );

  writeTextFile(
    arsenalPath(repoRoot, "memory/conventions.md"),
    buildConventionsSummary(repoRoot),
  );

  return { fileSummaries: summaries.length, modules: repoMap.modules.length };
}

function buildPublicApiSummary(files: { path: string; content?: string }[]): string {
  const lines = ["# Public API", ""];
  for (const file of files) {
    if (!file.content || !file.path.includes("index.")) continue;
    const symbols = extractAstSymbols(file.content).filter((s) => s.exported);
    if (symbols.length) {
      lines.push(`## ${file.path}`);
      for (const sym of symbols) {
        lines.push(`- ${sym.kind} \`${sym.name}\``);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

function buildTestsSummary(testIndex: TestIndex): string {
  return [
    "# Tests",
    "",
    `Test files: ${testIndex.testFiles.length}`,
    "",
    "## Links",
    ...testIndex.tests.map((t) => `- \`${t.testFile}\` → \`${t.targetFile}\``),
  ].join("\n");
}

function buildConventionsSummary(repoRoot: string): string {
  const path = arsenalPath(repoRoot, "memory/conventions.md");
  if (existsSync(path)) {
    const existing = readFileSync(path, "utf-8");
    if (!existing.includes("_Record repo-specific")) return existing;
  }

  const pkgPath = join(repoRoot, "package.json");
  const hints: string[] = ["# Conventions", ""];
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { scripts?: Record<string, string> };
    if (pkg.scripts?.test) hints.push(`- Test command: \`${pkg.scripts.test}\``);
    if (pkg.scripts?.lint) hints.push(`- Lint command: \`${pkg.scripts.lint}\``);
    if (pkg.scripts?.typecheck) hints.push(`- Typecheck command: \`${pkg.scripts.typecheck}\``);
  }
  return hints.join("\n");
}

export function loadFileSummaries(repoRoot: string): FileSummary[] {
  const dir = arsenalPath(repoRoot, "summaries/files");
  if (!existsSync(dir)) return [];
  const summaries: FileSummary[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const data = readJsonFile<FileSummary>(join(dir, file));
    if (data) summaries.push(data);
  }
  return summaries;
}
