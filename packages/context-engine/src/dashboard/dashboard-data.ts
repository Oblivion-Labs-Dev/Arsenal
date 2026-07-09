import { existsSync, statSync } from "fs";
import { arsenalPath } from "../core/paths.js";
import { loadConfig } from "../core/init-workspace.js";
import { loadFileSummaries } from "../cli/commands/summarize.js";
import { AnalyticsStore } from "../analytics/analytics-store.js";
import { calculateSavings } from "../analytics/savings-calculator.js";
import { detectStaleKnowledge } from "../analytics/stale-knowledge-detector.js";
import { calculateQualityScore } from "../analytics/quality-score.js";
import { generateImprovements } from "../analytics/improvement-engine.js";
import type { DashboardData } from "../analytics/analytics-types.js";
import { saveDashboardSnapshot } from "./dashboard-snapshot.js";

export function aggregateDashboardData(repoRoot: string): DashboardData {
  const store = new AnalyticsStore(repoRoot);
  const config = loadConfig(repoRoot);
  const builds = store.readContextBuilds();
  const events = store.readAgentEvents();
  const fileSummaries = loadFileSummaries(repoRoot);
  const stale = detectStaleKnowledge(repoRoot);
  const savings = calculateSavings(builds, events, fileSummaries);

  const compactPath = arsenalPath(repoRoot, "memory/compact-history.md");
  const compactUpdatedRecently =
    existsSync(compactPath) && Date.now() - statSync(compactPath).mtimeMs < 7 * 24 * 60 * 60 * 1000;

  const quality = calculateQualityScore({
    builds,
    events,
    stale,
    fileSummaries,
    config,
    compactUpdatedRecently,
  });

  const suggestions = generateImprovements({
    builds,
    events,
    stale,
    savings,
    fileSummaries,
    config,
  });

  store.writeSavingsReport(savings);
  store.writeStaleReport(stale);
  store.writeImprovementSuggestions({
    generatedAt: new Date().toISOString(),
    suggestions,
  });

  const opened = countByFile(events, "FILE_OPENED");
  const edited = countByFile(events, "FILE_EDITED");

  const trends = buildTrends(builds);

  const data: DashboardData = {
    overview: {
      totalTokensSaved: savings.estimatedTokensSaved,
      averageSavingsPercent: savings.averageSavingsPercent,
      contextBuildsCount: builds.length,
      averageQualityScore: quality.score,
      staleFilesCount: stale.staleFiles.length + stale.missingSummaries.length,
    },
    usageTrends: trends,
    hotspots: {
      mostOpenedFiles: opened,
      mostEditedFiles: edited,
      mostExpensiveModules: moduleTokens(builds),
      staleModules: stale.staleModules,
    },
    quality,
    stale,
    suggestions,
    recentTasks: [...builds].slice(-10).reverse(),
    savings,
  };

  saveDashboardSnapshot(repoRoot, data);

  return data;
}

function countByFile(events: { eventType: string; file?: string }[], type: string) {
  const map = new Map<string, number>();
  for (const e of events) {
    if (e.eventType !== type || !e.file) continue;
    map.set(e.file, (map.get(e.file) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
}

function moduleTokens(builds: { selectedFiles: string[]; estimatedContextTokens: number }[]) {
  const map = new Map<string, number>();
  for (const b of builds) {
    for (const file of b.selectedFiles) {
      const mod = file.split("/").slice(0, 2).join("/");
      map.set(mod, (map.get(mod) ?? 0) + b.estimatedContextTokens);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([module, tokens]) => ({ module, tokens }));
}

function buildTrends(builds: { timestamp: string; estimatedContextTokens: number; estimatedTokensSaved: number; budgetUsedPercent: number }[]) {
  const byDay = new Map<string, { used: number; saved: number; budget: number[] }>();
  for (const b of builds) {
    const day = b.timestamp.slice(0, 10);
    const entry = byDay.get(day) ?? { used: 0, saved: 0, budget: [] };
    entry.used += b.estimatedContextTokens;
    entry.saved += b.estimatedTokensSaved;
    entry.budget.push(b.budgetUsedPercent);
    byDay.set(day, entry);
  }
  const labels = [...byDay.keys()].sort();
  return {
    labels,
    tokensUsed: labels.map((d) => byDay.get(d)!.used),
    tokensSaved: labels.map((d) => byDay.get(d)!.saved),
    budgetUsedPercent: labels.map((d) => {
      const budgets = byDay.get(d)!.budget;
      return Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length);
    }),
  };
}
