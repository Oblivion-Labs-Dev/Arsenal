import type { ContextPackage } from "../core/context-builder.js";
import type { ArsenalConfig } from "../schemas/arsenal-config.schema.js";
import type { RepoMap } from "../schemas/repo-map.schema.js";
import { AnalyticsStore } from "./analytics-store.js";
import type { AgentEvent, AgentEventType, ContextBuildRecord } from "./analytics-types.js";
import { generateTaskId } from "./analytics-types.js";

export function logContextBuild(
  repoRoot: string,
  pkg: ContextPackage,
  config: ArsenalConfig,
  repoMap: RepoMap,
  taskId?: string,
): ContextBuildRecord {
  const id = taskId ?? generateTaskId();
  const fullRepoTokens = repoMap.files
    .filter((f) => f.kind === "source")
    .reduce((sum, f) => sum + Math.ceil(f.size / 4), 0);

  const estimatedTokensSaved = Math.max(0, fullRepoTokens - pkg.estimatedTokens);
  const savingsPercent =
    fullRepoTokens > 0 ? Math.round((estimatedTokensSaved / fullRepoTokens) * 1000) / 10 : 0;

  const record: ContextBuildRecord = {
    timestamp: new Date().toISOString(),
    taskId: id,
    task: pkg.query,
    estimatedContextTokens: pkg.estimatedTokens,
    estimatedFullRepoTokens: fullRepoTokens,
    estimatedTokensSaved,
    savingsPercent,
    selectedFiles: pkg.relevantFiles,
    selectedSummaries: pkg.summaries.map((s) => s.path),
    selectedSymbols: pkg.relevantSymbols,
    rawFilesLoaded: [],
    decisionsUsed: pkg.decisions,
    pitfallsUsed: pkg.pitfalls,
    testsSuggested: pkg.testsAffected,
    modelProfile: config.models.default,
    contextBudget: pkg.maxTokens,
    budgetUsedPercent: pkg.maxTokens > 0 ? Math.round((pkg.estimatedTokens / pkg.maxTokens) * 1000) / 10 : 0,
  };

  const store = new AnalyticsStore(repoRoot);
  store.appendContextBuild(record);
  store.appendAgentEvent({
    timestamp: record.timestamp,
    eventType: "CONTEXT_BUILT",
    taskId: id,
    metadata: {
      task: pkg.query,
      estimatedContextTokens: pkg.estimatedTokens,
      savingsPercent,
    },
  });
  store.appendUsage({
    timestamp: record.timestamp,
    action: "context_build",
    tokens: pkg.estimatedTokens,
    metadata: { taskId: id, savingsPercent },
  });

  return record;
}

export function logAgentEvent(
  repoRoot: string,
  eventType: AgentEventType,
  data: Omit<AgentEvent, "timestamp" | "eventType">,
): void {
  const store = new AnalyticsStore(repoRoot);
  store.appendAgentEvent({
    timestamp: new Date().toISOString(),
    eventType,
    ...data,
  });
}

export function logFileOpened(repoRoot: string, file: string, taskId?: string, tokens?: number): void {
  logAgentEvent(repoRoot, "FILE_OPENED", { file, taskId, estimatedTokens: tokens, module: inferModule(file) });
}

export function logFileEdited(repoRoot: string, file: string, taskId?: string, tokens?: number): void {
  logAgentEvent(repoRoot, "FILE_EDITED", { file, taskId, estimatedTokens: tokens, module: inferModule(file) });
}

function inferModule(filePath: string): string | undefined {
  const parts = filePath.split("/");
  if (parts.length >= 2 && parts[0] === "src") return parts[1];
  return parts[0];
}
