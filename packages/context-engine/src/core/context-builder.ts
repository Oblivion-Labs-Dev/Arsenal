import type { ArsenalConfig } from "../schemas/arsenal-config.schema.js";
import type { RepoMap } from "../schemas/repo-map.schema.js";
import type { KnowledgeGraph } from "../schemas/knowledge-graph.schema.js";
import type { FileSummary } from "../schemas/file-summary.schema.js";
import type { SymbolIndex } from "../indexers/symbol-indexer.js";
import type { TestIndex } from "../indexers/test-indexer.js";
import { queryKnowledgeGraph } from "../graph/graph-query.js";
import { enforceTokenBudget, selectBudgetForQuery, type BudgetItem } from "../core/context-budgeter.js";
import { estimateTokens } from "../core/token-estimator.js";
import { tokenizeQuery, scoreText } from "../core/paths.js";

export interface ContextPackage {
  query: string;
  interpretation: string;
  relevantFiles: string[];
  relevantSymbols: string[];
  summaries: FileSummary[];
  decisions: string[];
  pitfalls: string[];
  commands: string[];
  testsAffected: string[];
  estimatedTokens: number;
  avoidedTokens: number;
  maxTokens: number;
}

export interface ContextBuildInput {
  query: string;
  config: ArsenalConfig;
  repoMap: RepoMap;
  graph: KnowledgeGraph;
  fileSummaries: FileSummary[];
  symbolIndex: SymbolIndex;
  testIndex: TestIndex;
  decisions: string[];
  pitfalls: string[];
  commands: string[];
}

export function buildContextPackage(input: ContextBuildInput): ContextPackage {
  const terms = tokenizeQuery(input.query);
  const graphResult = queryKnowledgeGraph(input.graph, input.query);
  const maxTokens = selectBudgetForQuery(input.query, input.config);

  const scoredFiles = input.fileSummaries
    .map((summary) => ({
      summary,
      score:
        scoreText(`${summary.path} ${summary.purpose} ${summary.keySymbols.join(" ")}`, terms) +
        (graphResult.filePaths.includes(summary.path) ? 3 : 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const relevantFiles = [
    ...new Set([
      ...graphResult.filePaths,
      ...scoredFiles.slice(0, 12).map((s) => s.summary.path),
    ]),
  ].slice(0, 15);

  const relevantSymbols = [
    ...new Set([
      ...graphResult.symbolNames,
      ...input.symbolIndex.symbols
        .filter((s) => relevantFiles.includes(s.file))
        .map((s) => s.name),
    ]),
  ].slice(0, 20);

  const selectedSummaries = scoredFiles.slice(0, 10).map((s) => s.summary);

  const testsAffected = input.testIndex.tests
    .filter((t) => relevantFiles.some((f) => f === t.targetFile || f === t.testFile))
    .map((t) => t.testFile);

  const items: BudgetItem[] = [
    {
      id: "task",
      label: "interpretation",
      content: input.query,
      tokens: estimateTokens(input.query),
      priority: 100,
    },
    ...selectedSummaries.map((s, i) => ({
      id: `summary:${s.path}`,
      label: s.path,
      content: JSON.stringify(s),
      tokens: estimateTokens(JSON.stringify(s)),
      priority: 80 - i,
    })),
    ...input.decisions.map((d, i) => ({
      id: `decision:${i}`,
      label: d,
      content: d,
      tokens: estimateTokens(d),
      priority: 50,
    })),
  ];

  const budget = enforceTokenBudget(items, maxTokens);
  const estimatedTokens = budget.totalTokens;

  const totalSourceTokens = input.repoMap.files
    .filter((f) => f.kind === "source")
    .reduce((sum, f) => sum + Math.ceil(f.size / 4), 0);

  const interpretation = inferInterpretation(input.query, relevantFiles, relevantSymbols);

  return {
    query: input.query,
    interpretation,
    relevantFiles,
    relevantSymbols,
    summaries: selectedSummaries,
    decisions: input.decisions.slice(0, 8),
    pitfalls: input.pitfalls.slice(0, 8),
    commands: input.commands,
    testsAffected: [...new Set(testsAffected)],
    estimatedTokens,
    avoidedTokens: Math.max(0, totalSourceTokens - estimatedTokens),
    maxTokens,
  };
}

function inferInterpretation(query: string, files: string[], symbols: string[]): string {
  const parts = [`Work on: ${query}`];
  if (files.length) parts.push(`Focus files: ${files.slice(0, 5).join(", ")}`);
  if (symbols.length) parts.push(`Key symbols: ${symbols.slice(0, 5).join(", ")}`);
  return parts.join(". ");
}

export function selectRelevantFiles(
  query: string,
  summaries: FileSummary[],
  graph: KnowledgeGraph,
): string[] {
  const graphResult = queryKnowledgeGraph(graph, query);
  const terms = tokenizeQuery(query);
  const scored = summaries
    .map((s) => ({
      path: s.path,
      score: scoreText(`${s.path} ${s.purpose}`, terms) + (graphResult.filePaths.includes(s.path) ? 2 : 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((s) => s.path);
}
