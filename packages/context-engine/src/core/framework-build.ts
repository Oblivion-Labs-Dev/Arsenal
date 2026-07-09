import { existsSync, readFileSync } from "fs";
import { ContextCompiler } from "@arsenal/context";
import { BUDGET_PROFILES, selectProfileForQuery } from "@arsenal/budget";
import type { ContextBuildInput, ContextPackage } from "./context-builder.js";
import { queryKnowledgeGraph } from "../graph/graph-query.js";
import { arsenalPath } from "./paths.js";

export function buildWithFramework(
  repoRoot: string,
  input: ContextBuildInput,
): { pkg: ContextPackage; markdown: string } {
  const graphResult = queryKnowledgeGraph(input.graph, input.query);
  const architecturePath = arsenalPath(repoRoot, "summaries/architecture.md");
  const architecture = existsSync(architecturePath)
    ? readFileSync(architecturePath, "utf-8")
    : undefined;

  const profile = selectProfileForQuery(input.query);
  const compiler = new ContextCompiler();
  const compiled = compiler.compile({
    intent: input.query,
    architecture,
    fileSummaries: input.fileSummaries.map((s) => {
      const repoFile = input.repoMap.files.find((f) => f.path === s.path);
      return {
        path: s.path,
        purpose: s.purpose,
        exports: s.keySymbols,
        size: repoFile?.size,
      };
    }),
    symbols: graphResult.symbolNames,
    decisions: input.decisions,
    pitfalls: input.pitfalls,
    budgetProfile: profile,
  });

  const relevantFiles = [
    ...new Set([...graphResult.filePaths, ...compiled.selectedFiles]),
  ].slice(0, 15);

  const relevantSymbols = [
    ...new Set([
      ...graphResult.symbolNames,
      ...input.symbolIndex.symbols
        .filter((s) => relevantFiles.includes(s.file))
        .map((s) => s.name),
    ]),
  ].slice(0, 20);

  const selectedSummaries = input.fileSummaries
    .filter((s) => relevantFiles.includes(s.path))
    .slice(0, 10);

  const testsAffected = [
    ...new Set(
      input.testIndex.tests
        .filter((t) => relevantFiles.some((f) => f === t.targetFile || f === t.testFile))
        .map((t) => t.testFile),
    ),
  ];

  const maxTokens = BUDGET_PROFILES[profile].maxPromptTokens;
  const totalSourceTokens = input.repoMap.files
    .filter((f) => f.kind === "source")
    .reduce((sum, f) => sum + Math.ceil(f.size / 4), 0);

  const estimatedTokens =
    compiled.estimatedTokens + compiled.compiledPrompt.estimatedTokens;

  const pkg: ContextPackage = {
    query: input.query,
    interpretation: [
      `Work on: ${input.query}`,
      relevantFiles.length ? `Focus files: ${relevantFiles.slice(0, 5).join(", ")}` : "",
      relevantSymbols.length ? `Key symbols: ${relevantSymbols.slice(0, 5).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(". "),
    relevantFiles,
    relevantSymbols,
    summaries: selectedSummaries,
    decisions: input.decisions.slice(0, 8),
    pitfalls: input.pitfalls.slice(0, 8),
    commands: input.commands,
    testsAffected,
    estimatedTokens,
    avoidedTokens: Math.max(0, totalSourceTokens - estimatedTokens),
    maxTokens,
  };

  const markdown = [
    "# Agent Handoff",
    "",
    compiled.compiledPrompt.markdown,
    "",
    "## Tests likely affected",
    ...(testsAffected.length ? testsAffected.map((t) => `- \`${t}\``) : ["- none"]),
    "",
    "## Commands",
    ...(input.commands.length ? input.commands.map((c) => `- \`${c}\``) : ["- none"]),
  ].join("\n");

  return { pkg, markdown };
}
