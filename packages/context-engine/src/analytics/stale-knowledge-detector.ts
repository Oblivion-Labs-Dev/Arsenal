import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { arsenalPath } from "../core/paths.js";
import { readJsonFile } from "../core/file-io.js";
import type { KnowledgeGraph } from "../schemas/knowledge-graph.schema.js";
import type { RepoMap } from "../schemas/repo-map.schema.js";
import type { FileSummary } from "../schemas/file-summary.schema.js";
import type { StaleKnowledgeReport } from "./analytics-types.js";

export function detectStaleKnowledge(
  repoRoot: string,
  repoMap?: RepoMap | null,
  graph?: KnowledgeGraph | null,
): StaleKnowledgeReport {
  const map = repoMap ?? readJsonFile<RepoMap>(arsenalPath(repoRoot, "repo-map.json"));
  const knowledgeGraph =
    graph ?? readJsonFile<KnowledgeGraph>(arsenalPath(repoRoot, "knowledge-graph.json"));
  const hashes = readJsonFile<Record<string, string>>(arsenalPath(repoRoot, "cache/hashes.json")) ?? {};

  const summariesDir = arsenalPath(repoRoot, "summaries/files");
  const summaries = loadSummaries(summariesDir);
  const summaryByPath = new Map(summaries.map((s) => [s.path, s]));

  const staleFiles: string[] = [];
  const missingSummaries: string[] = [];

  if (map) {
    for (const file of map.files.filter((f) => f.kind === "source")) {
      const summary = summaryByPath.get(file.path);
      if (!summary) {
        missingSummaries.push(file.path);
        continue;
      }
      if (summary.lastHash !== file.hash || (hashes[file.path] && hashes[file.path] !== summary.lastHash)) {
        staleFiles.push(file.path);
      }
    }
  }

  const staleModules = [...new Set(staleFiles.map((f) => f.split("/").slice(0, 2).join("/")))];

  let brokenGraphEdges = 0;
  if (knowledgeGraph) {
    const nodeIds = new Set(knowledgeGraph.nodes.map((n) => n.id));
    for (const edge of knowledgeGraph.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) brokenGraphEdges += 1;
    }
  }

  const decisionsPath = arsenalPath(repoRoot, "memory/decisions.md");
  let outdatedDecisions = false;
  if (existsSync(decisionsPath)) {
    const age = Date.now() - statSync(decisionsPath).mtimeMs;
    outdatedDecisions = age > 30 * 24 * 60 * 60 * 1000;
  }

  const recommendedCommands: string[] = [];
  if (staleFiles.length || missingSummaries.length) {
    recommendedCommands.push("arsenal context index", "arsenal context summarize");
  }
  if (brokenGraphEdges > 0) {
    recommendedCommands.push("arsenal context graph");
  }

  return {
    generatedAt: new Date().toISOString(),
    staleFiles,
    staleModules,
    missingSummaries,
    brokenGraphEdges,
    outdatedDecisions,
    recommendedCommands: [...new Set(recommendedCommands)],
  };
}

function loadSummaries(dir: string): FileSummary[] {
  if (!existsSync(dir)) return [];
  const summaries: FileSummary[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const data = readJsonFile<FileSummary>(join(dir, file));
    if (data) summaries.push(data);
  }
  return summaries;
}
