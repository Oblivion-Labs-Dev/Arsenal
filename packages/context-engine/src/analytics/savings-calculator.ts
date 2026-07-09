import type { ContextBuildRecord, SavingsReport } from "./analytics-types.js";
import type { AgentEvent } from "./analytics-types.js";
import type { FileSummary } from "../schemas/file-summary.schema.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export function calculateSavings(
  builds: ContextBuildRecord[],
  events: AgentEvent[],
  fileSummaries: FileSummary[] = [],
): SavingsReport {
  const now = Date.now();
  const last7 = builds.filter((b) => now - Date.parse(b.timestamp) <= 7 * DAY_MS);
  const last30 = builds.filter((b) => now - Date.parse(b.timestamp) <= 30 * DAY_MS);

  const totalSaved = builds.reduce((sum, b) => sum + b.estimatedTokensSaved, 0);
  const totalContext = builds.reduce((sum, b) => sum + b.estimatedContextTokens, 0);
  const totalFull = builds.reduce((sum, b) => sum + b.estimatedFullRepoTokens, 0);
  const avgSavings =
    builds.length > 0
      ? Math.round((builds.reduce((sum, b) => sum + b.savingsPercent, 0) / builds.length) * 10) / 10
      : 0;

  const fileCounts = new Map<string, number>();
  for (const event of events) {
    if (!event.file) continue;
    if (["FILE_OPENED", "FILE_EDITED"].includes(event.eventType)) {
      fileCounts.set(event.file, (fileCounts.get(event.file) ?? 0) + 1);
    }
  }
  for (const build of builds) {
    for (const file of build.selectedFiles) {
      fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
    }
  }

  const moduleRisk = new Map<string, number>();
  for (const summary of fileSummaries) {
    if (summary.risks.length > 0) {
      const mod = summary.path.split("/").slice(0, 2).join("/");
      moduleRisk.set(mod, (moduleRisk.get(mod) ?? 0) + summary.risks.length);
    }
  }
  for (const event of events) {
    if (event.eventType === "FILE_EDITED" && event.module) {
      moduleRisk.set(event.module, (moduleRisk.get(event.module) ?? 0) + 2);
    }
  }

  const latest = builds[builds.length - 1];

  return {
    generatedAt: new Date().toISOString(),
    estimatedFullRepoTokens: latest?.estimatedFullRepoTokens ?? totalFull,
    estimatedSelectedContextTokens: totalContext,
    estimatedTokensSaved: totalSaved,
    savingsPercent:
      totalFull > 0 ? Math.round((totalSaved / totalFull) * 1000) / 10 : latest?.savingsPercent ?? 0,
    averageSavingsPercent: avgSavings,
    tokensSavedLast7Days: last7.reduce((sum, b) => sum + b.estimatedTokensSaved, 0),
    tokensSavedLast30Days: last30.reduce((sum, b) => sum + b.estimatedTokensSaved, 0),
    totalContextBuilds: builds.length,
    mostExpensiveTasks: [...builds]
      .sort((a, b) => b.estimatedContextTokens - a.estimatedContextTokens)
      .slice(0, 5)
      .map((b) => ({ task: b.task, tokens: b.estimatedContextTokens })),
    mostRepeatedFiles: [...fileCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count })),
    highestRiskModules: [...moduleRisk.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([module, score]) => ({ module, score })),
  };
}
