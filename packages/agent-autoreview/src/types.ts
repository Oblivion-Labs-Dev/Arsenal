export type ReviewMode = "fast" | "thorough";

export type CheckKind =
  | "visual"
  | "animation"
  | "accessibility"
  | "responsive"
  | "cross-browser"
  | "baseline"
  | "static"
  | "runtime"
  | "interaction";

export type BrowserEngine = "chromium" | "firefox" | "webkit";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FindingCategory =
  | "static"
  | "runtime"
  | "visual"
  | "interaction"
  | "animation"
  | "accessibility"
  | "edge-case"
  | "scope";

export interface ScopedItem {
  path: string;
  reason: string;
}

export interface ScopeManifest {
  changedFiles: string[];
  affectedComponents: ScopedItem[];
  affectedRoutes: ScopedItem[];
  affectedTests: ScopedItem[];
  affectedInteractions: ScopedItem[];
  supportingFiles: ScopedItem[];
  excludedFiles: ScopedItem[];
  expandedItems: ScopedItem[];
  scopeReasoning: Record<string, string>;
  generatedAt: string;
  mode: ReviewMode;
  source: ChangeSource;
}

export type ChangeSource =
  | "explicit-files"
  | "task-session"
  | "uncommitted"
  | "branch-diff"
  | "commit-diff"
  | "none";

export interface ScopeBudget {
  maxChangedSourceFiles: number;
  maxAffectedRoutes: number;
  maxBrowserPages: number;
  maxScreenshots: number;
  maxModelCriticCalls: number;
  maxRepairIterations: number;
  maxDependencyDepth: number;
  maxReverseDependencyDepth: number;
  maxTestDurationSeconds: number;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  confidence: number;
  component?: string;
  file?: string;
  selector?: string;
  screenshot?: string;
  explanation: string;
  recommendedFix: string;
  resolved?: boolean;
  source: "deterministic" | "critic" | "test" | "gate";
}

export interface InteractionManifest {
  interaction: string;
  route: string;
  trigger: string;
  expectedResult: string;
  sourceFile: string;
}

export interface CheckResult {
  name: string;
  status: "pass" | "fail" | "skip" | "error";
  durationMs: number;
  details?: string;
  findings?: Finding[];
}

export interface BudgetUsage {
  changedSourceFiles: number;
  affectedRoutes: number;
  browserPages: number;
  screenshots: number;
  modelCriticCalls: number;
  repairIterations: number;
  dependencyDepth: number;
  testDurationSeconds: number;
}

export interface AutoreviewReport {
  taskDescription: string;
  mode: ReviewMode;
  changedFiles: string[];
  affectedComponents: ScopedItem[];
  affectedRoutes: ScopedItem[];
  scopeReasoning: Record<string, string>;
  checksExecuted: CheckResult[];
  checksSkipped: string[];
  screenshotsCaptured: string[];
  interactionsTested: InteractionManifest[];
  issuesFound: Finding[];
  fixesApplied: string[];
  remainingIssues: Finding[];
  scopeExclusions: ScopedItem[];
  expandedItems: ScopedItem[];
  budgetUsage: BudgetUsage;
  modelCallsUsed: number;
  estimatedTokensConsumed: number;
  cacheHits: number;
  qualityGatesPassed: boolean;
  qualityGateResults: Record<string, boolean>;
  disclaimer: string;
  generatedAt: string;
}

export interface TaskSession {
  id: string;
  taskDescription: string;
  startedAt: string;
  startingCommit: string | null;
  branch?: string | null;
  initialWorkingTreeHash: string;
  existingModifiedFiles: string[];
  /** Content hashes of dirty files at session start (for re-dirty detection). */
  existingFileHashes?: Record<string, string>;
  stagedAtStart?: string[];
  unstagedAtStart?: string[];
  untrackedAtStart?: string[];
  reportStateAtStart?: string | null;
  finishedAt?: string;
}

export interface AutoreviewCliOptions {
  task?: string;
  base?: string;
  files?: string[];
  route?: string[];
  maxIterations?: number;
  mode?: ReviewMode;
  checks?: CheckKind[];
  dryRun?: boolean;
  reportOnly?: boolean;
  cwd?: string;
  configPath?: string;
}

export interface CriticProvider {
  name: string;
  review(input: CriticInput): Promise<Finding[]>;
}

export interface CriticInput {
  role: "visual" | "interaction" | "adversarial" | "completion";
  taskDescription: string;
  changedFilesSummary: string;
  scopeExcerpt: string;
  screenshots?: string[];
  codeExcerpts?: string[];
  designRules?: string[];
  maxTokens?: number;
}

export interface RepairPlan {
  findings: Finding[];
  steps: RepairStep[];
}

export interface RepairStep {
  findingId: string;
  file?: string;
  action: string;
  invalidates: Array<"static" | "tests" | "runtime" | "screenshots" | "critics">;
}
