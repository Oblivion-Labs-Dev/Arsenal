import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { isFeatureEnabled } from "@arsenal/core";
import { loadConfig } from "../../core/init-workspace.js";
import { arsenalPath } from "../../core/paths.js";
import { readJsonFile, writeTextFile } from "../../core/file-io.js";
import { buildContextPackage, type ContextBuildInput } from "../../core/context-builder.js";
import { buildWithFramework } from "../../core/framework-build.js";
import type { RepoMap } from "../../schemas/repo-map.schema.js";
import type { KnowledgeGraph } from "../../schemas/knowledge-graph.schema.js";
import type { SymbolIndex } from "../../indexers/symbol-indexer.js";
import { buildTestIndex } from "../../indexers/test-indexer.js";
import { scanRepo } from "../../core/repo-scanner.js";
import { DecisionStore } from "../../memory/decision-store.js";
import { PitfallStore } from "../../memory/pitfall-store.js";
import { buildAgentHandoffMarkdown } from "../../prompts/prompt-builder.js";
import { formatTokenCount } from "../../core/token-estimator.js";
import { loadFileSummaries } from "./summarize.js";
import { logContextBuild } from "../../analytics/usage-logger.js";

export function runBuild(repoRoot: string, query: string) {
  if (!query.trim()) throw new Error("Query is required.");

  const config = loadConfig(repoRoot);
  const repoMap = readJsonFile<RepoMap>(arsenalPath(repoRoot, "repo-map.json"));
  const graph = readJsonFile<KnowledgeGraph>(arsenalPath(repoRoot, "knowledge-graph.json"));
  const symbolIndex = readJsonFile<SymbolIndex>(arsenalPath(repoRoot, "symbol-index.json"));

  if (!repoMap || !graph || !symbolIndex) {
    throw new Error("Run `arsenal context index` and `arsenal context graph` first.");
  }

  const fileSummaries = loadFileSummaries(repoRoot);
  const scan = scanRepo(repoRoot, config, { includeContent: false });
  const testIndex = buildTestIndex(scan.files);

  const decisions = new DecisionStore(repoRoot).readAll();
  const pitfalls = new PitfallStore(repoRoot).readList();
  const commands = detectCommands(repoRoot);

  const buildInput: ContextBuildInput = {
    query,
    config,
    repoMap,
    graph,
    fileSummaries,
    symbolIndex,
    testIndex,
    decisions,
    pitfalls,
    commands,
  };

  const useFramework = isFeatureEnabled("contextCompiler") && isFeatureEnabled("budgetEngine");
  const { pkg, markdown } = useFramework
    ? buildWithFramework(repoRoot, buildInput)
    : (() => {
        const legacyPkg = buildContextPackage(buildInput);
        return { pkg: legacyPkg, markdown: buildAgentHandoffMarkdown(legacyPkg) };
      })();
  const outPath = arsenalPath(repoRoot, "prompts/agent-handoff.md");
  writeTextFile(outPath, markdown);

  const buildRecord = logContextBuild(repoRoot, pkg, config, repoMap);

  return {
    path: outPath,
    taskId: buildRecord.taskId,
    estimatedTokens: pkg.estimatedTokens,
    avoidedTokens: pkg.avoidedTokens,
    savingsPercent: buildRecord.savingsPercent,
    formatted: {
      estimate: formatTokenCount(pkg.estimatedTokens),
      avoided: formatTokenCount(buildRecord.estimatedTokensSaved),
    },
  };
}

function detectCommands(repoRoot: string): string[] {
  const pkgPath = join(repoRoot, "package.json");
  if (!existsSync(pkgPath)) return [];
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { scripts?: Record<string, string> };
  const scripts = pkg.scripts ?? {};
  return ["test", "lint", "typecheck", "build"]
    .filter((k) => scripts[k])
    .map((k) => `npm run ${k}`);
}
