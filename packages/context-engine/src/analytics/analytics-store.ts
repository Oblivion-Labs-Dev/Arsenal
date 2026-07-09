import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { arsenalPath } from "../core/paths.js";
import { readJsonFile, writeJsonFile } from "../core/file-io.js";
import type {
  AgentEvent,
  ContextBuildRecord,
  DashboardSnapshot,
  ImprovementSuggestionsReport,
  SavingsReport,
  StaleKnowledgeReport,
  UsageLogEntry,
} from "./analytics-types.js";

const ANALYTICS_DIR = "analytics";

export function analyticsPath(repoRoot: string, ...segments: string[]): string {
  return join(arsenalPath(repoRoot, ANALYTICS_DIR), ...segments);
}

export function ensureAnalyticsDir(repoRoot: string): void {
  mkdirSync(analyticsPath(repoRoot), { recursive: true });
}

function ensureJsonl(path: string): void {
  if (!existsSync(path)) {
    writeFileSync(path, "", "utf-8");
  }
}

export function ensureAnalyticsFiles(repoRoot: string): void {
  ensureAnalyticsDir(repoRoot);
  ensureJsonl(analyticsPath(repoRoot, "usage-log.jsonl"));
  ensureJsonl(analyticsPath(repoRoot, "context-builds.jsonl"));
  ensureJsonl(analyticsPath(repoRoot, "agent-events.jsonl"));

  const defaults: [string, unknown][] = [
    ["savings-report.json", emptySavingsReport()],
    ["improvement-suggestions.json", { generatedAt: new Date().toISOString(), suggestions: [] }],
    ["stale-knowledge-report.json", emptyStaleReport()],
    ["dashboard-details.json", emptyDashboardDetails()],
  ];

  for (const [file, data] of defaults) {
    const path = analyticsPath(repoRoot, file);
    if (!existsSync(path)) {
      writeJsonFile(path, data);
    }
  }
}

function emptySavingsReport(): SavingsReport {
  return {
    generatedAt: new Date().toISOString(),
    estimatedFullRepoTokens: 0,
    estimatedSelectedContextTokens: 0,
    estimatedTokensSaved: 0,
    savingsPercent: 0,
    averageSavingsPercent: 0,
    tokensSavedLast7Days: 0,
    tokensSavedLast30Days: 0,
    totalContextBuilds: 0,
    mostExpensiveTasks: [],
    mostRepeatedFiles: [],
    highestRiskModules: [],
  };
}

function emptyStaleReport(): StaleKnowledgeReport {
  return {
    generatedAt: new Date().toISOString(),
    staleFiles: [],
    staleModules: [],
    missingSummaries: [],
    brokenGraphEdges: 0,
    outdatedDecisions: false,
    recommendedCommands: [],
  };
}

function emptyDashboardDetails() {
  return {
    contextBuilds: [],
    agentEvents: [],
    usageLog: [],
    patterns: {
      repeatedModules: [],
      heavilyEditedModules: [],
      totalBuilds: 0,
      totalEvents: 0,
    },
  };
}

export function appendJsonl<T>(path: string, entry: T): void {
  mkdirSync(dirname(path), { recursive: true });
  const line = JSON.stringify(entry) + "\n";
  const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";
  writeFileSync(path, existing + line, "utf-8");
}

export function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf-8").trim();
  if (!content) return [];
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export class AnalyticsStore {
  constructor(private repoRoot: string) {
    ensureAnalyticsFiles(repoRoot);
  }

  appendContextBuild(record: ContextBuildRecord): void {
    appendJsonl(analyticsPath(this.repoRoot, "context-builds.jsonl"), record);
  }

  appendAgentEvent(event: AgentEvent): void {
    appendJsonl(analyticsPath(this.repoRoot, "agent-events.jsonl"), event);
  }

  appendUsage(entry: UsageLogEntry): void {
    appendJsonl(analyticsPath(this.repoRoot, "usage-log.jsonl"), entry);
  }

  readContextBuilds(): ContextBuildRecord[] {
    return readJsonl<ContextBuildRecord>(analyticsPath(this.repoRoot, "context-builds.jsonl"));
  }

  readAgentEvents(): AgentEvent[] {
    return readJsonl<AgentEvent>(analyticsPath(this.repoRoot, "agent-events.jsonl"));
  }

  readUsageLog(): UsageLogEntry[] {
    return readJsonl<UsageLogEntry>(analyticsPath(this.repoRoot, "usage-log.jsonl"));
  }

  writeSavingsReport(report: SavingsReport): void {
    writeJsonFile(analyticsPath(this.repoRoot, "savings-report.json"), report);
  }

  readSavingsReport(): SavingsReport {
    return readJsonFile<SavingsReport>(analyticsPath(this.repoRoot, "savings-report.json")) ?? emptySavingsReport();
  }

  writeImprovementSuggestions(report: ImprovementSuggestionsReport): void {
    writeJsonFile(analyticsPath(this.repoRoot, "improvement-suggestions.json"), report);
  }

  readImprovementSuggestions(): ImprovementSuggestionsReport {
    return (
      readJsonFile<ImprovementSuggestionsReport>(
        analyticsPath(this.repoRoot, "improvement-suggestions.json"),
      ) ?? { generatedAt: new Date().toISOString(), suggestions: [] }
    );
  }

  writeStaleReport(report: StaleKnowledgeReport): void {
    writeJsonFile(analyticsPath(this.repoRoot, "stale-knowledge-report.json"), report);
  }

  readStaleReport(): StaleKnowledgeReport {
    return readJsonFile<StaleKnowledgeReport>(analyticsPath(this.repoRoot, "stale-knowledge-report.json")) ?? emptyStaleReport();
  }

  writeDashboardSnapshot(snapshot: DashboardSnapshot): void {
    writeJsonFile(analyticsPath(this.repoRoot, "dashboard.json"), snapshot);
    writeJsonFile(analyticsPath(this.repoRoot, "dashboard-details.json"), snapshot.details);
  }

  readDashboardSnapshot(): DashboardSnapshot | null {
    return readJsonFile<DashboardSnapshot>(analyticsPath(this.repoRoot, "dashboard.json"));
  }
}
