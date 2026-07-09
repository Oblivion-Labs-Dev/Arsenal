export interface DashboardApiResponse {
  generatedAt: string;
  repoRoot: string;
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
  quality: {
    score: number;
    grade: string;
    reasons: string[];
    improvements: string[];
  };
  stale: unknown;
  suggestions: { id: string; message: string }[];
  recentTasks: {
    taskId: string;
    task: string;
    timestamp: string;
    estimatedContextTokens: number;
    estimatedTokensSaved: number;
    savingsPercent: number;
    selectedFiles: string[];
  }[];
  savings: { averageSavingsPercent: number };
  details: {
    contextBuilds: unknown[];
    agentEvents: unknown[];
    patterns: {
      totalBuilds: number;
      totalEvents: number;
      repeatedModules: { module: string; count: number }[];
      heavilyEditedModules: { module: string; edits: number }[];
    };
  } | null;
}
