export type AgentEventType =
  | "CONTEXT_BUILT"
  | "FILE_OPENED"
  | "FILE_EDITED"
  | "TEST_RUN"
  | "TEST_FAILED"
  | "TEST_PASSED"
  | "SUMMARY_STALE"
  | "SUMMARY_UPDATED"
  | "DECISION_ADDED"
  | "PITFALL_ADDED"
  | "COMPACT_CREATED";

export interface ContextBuildRecord {
  timestamp: string;
  taskId: string;
  task: string;
  estimatedContextTokens: number;
  estimatedFullRepoTokens: number;
  estimatedTokensSaved: number;
  savingsPercent: number;
  selectedFiles: string[];
  selectedSummaries: string[];
  selectedSymbols: string[];
  rawFilesLoaded: string[];
  decisionsUsed: string[];
  pitfallsUsed: string[];
  testsSuggested: string[];
  modelProfile: string;
  contextBudget: number;
  budgetUsedPercent: number;
}

export interface AgentEvent {
  timestamp: string;
  eventType: AgentEventType;
  taskId?: string;
  file?: string;
  module?: string;
  estimatedTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface UsageLogEntry {
  timestamp: string;
  action: string;
  tokens?: number;
  metadata?: Record<string, unknown>;
}

export interface SavingsReport {
  generatedAt: string;
  estimatedFullRepoTokens: number;
  estimatedSelectedContextTokens: number;
  estimatedTokensSaved: number;
  savingsPercent: number;
  averageSavingsPercent: number;
  tokensSavedLast7Days: number;
  tokensSavedLast30Days: number;
  totalContextBuilds: number;
  mostExpensiveTasks: { task: string; tokens: number }[];
  mostRepeatedFiles: { file: string; count: number }[];
  highestRiskModules: { module: string; score: number }[];
}

export interface ImprovementSuggestion {
  id: string;
  priority: number;
  category: string;
  message: string;
  command?: string;
}

export interface ImprovementSuggestionsReport {
  generatedAt: string;
  suggestions: ImprovementSuggestion[];
}

export interface StaleKnowledgeReport {
  generatedAt: string;
  staleFiles: string[];
  staleModules: string[];
  missingSummaries: string[];
  brokenGraphEdges: number;
  outdatedDecisions: boolean;
  recommendedCommands: string[];
}

export interface QualityScoreResult {
  score: number;
  grade: string;
  reasons: string[];
  improvements: string[];
}

export interface DashboardData {
  overview: {
    totalTokensSaved: number;
    averageSavingsPercent: number;
    contextBuildsCount: number;
    averageQualityScore: number;
    staleFilesCount: number;
  };
  usageTrends: {
    labels: string[];
    tokensUsed: number[];
    tokensSaved: number[];
    budgetUsedPercent: number[];
  };
  hotspots: {
    mostOpenedFiles: { file: string; count: number }[];
    mostEditedFiles: { file: string; count: number }[];
    mostExpensiveModules: { module: string; tokens: number }[];
    staleModules: string[];
  };
  quality: QualityScoreResult;
  stale: StaleKnowledgeReport;
  suggestions: ImprovementSuggestion[];
  recentTasks: ContextBuildRecord[];
  savings: SavingsReport;
}

export interface DashboardDetails {
  contextBuilds: ContextBuildRecord[];
  agentEvents: AgentEvent[];
  usageLog: UsageLogEntry[];
  patterns: {
    repeatedModules: { module: string; count: number }[];
    heavilyEditedModules: { module: string; edits: number }[];
    totalBuilds: number;
    totalEvents: number;
  };
}

/** Full dashboard snapshot persisted to `.arsenal/analytics/dashboard.json` */
export interface DashboardSnapshot extends DashboardData {
  generatedAt: string;
  details: DashboardDetails;
}

export function generateTaskId(): string {
  return `ctx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function gradeFromScore(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Work";
  return "Poor";
}
