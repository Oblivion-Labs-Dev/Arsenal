import type { ReviewMode, ScopeBudget } from "../types.js";

export interface AppConfig {
  startCommand: string;
  url: string;
  readyTimeoutMs: number;
}

export interface ScopeConfig {
  dependencyDepth: number;
  reverseDependencyDepth: number;
  maxRoutes: number;
  maxScreenshots: number;
  ignoredFiles: string[];
  ignoredRoutes: string[];
  riskExpansionEnabled: boolean;
}

export interface ReviewConfig {
  mode: ReviewMode;
  maxIterations: number;
  maxCriticCalls: number;
}

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

export interface AnimationThresholds {
  microMinMs: number;
  microMaxMs: number;
  componentMinMs: number;
  componentMaxMs: number;
  sceneMaxMs: number;
}

export interface QualityGatesConfig {
  relatedTestsPass: boolean;
  typeErrorsInScope: number;
  lintErrorsInScope: number;
  runtimeErrorsInScope: number;
  relevantFailedRequests: number;
  detectedCriticalOverlaps: number;
  horizontalOverflowInChangedSurface: number;
  accessibilityCriticalIssues: number;
  unresolvedCriticalFindings: number;
  unresolvedHighConfidenceHighSeverityFindings: number;
  primaryInteractionsPass: boolean;
}

export interface ModelConfig {
  provider: "none" | "openai" | "anthropic" | "compatible";
  model?: string;
  apiKeyEnv?: string;
  maxTokensPerCall: number;
  maxCriticCalls: number;
}

export interface AutoreviewConfig {
  baseBranch: string;
  app: AppConfig;
  scope: ScopeConfig;
  review: ReviewConfig;
  viewports: ViewportConfig[];
  criticalSelectors: string[];
  routeMappings: Record<string, string[]>;
  componentPreviewMappings: Record<string, string>;
  testCommands: {
    unitRelated: string;
    lint: string;
    typecheck: string;
    format: string;
  };
  qualityGates: QualityGatesConfig;
  animation: AnimationThresholds;
  screenshotDirectory: string;
  cacheDirectory: string;
  reportDirectory: string;
  model: ModelConfig;
  stopDependencyPatterns: string[];
  budgets: {
    fast: ScopeBudget;
    thorough: ScopeBudget;
  };
}

export const DEFAULT_FAST_BUDGET: ScopeBudget = {
  maxChangedSourceFiles: 20,
  maxAffectedRoutes: 2,
  maxBrowserPages: 2,
  maxScreenshots: 6,
  maxModelCriticCalls: 1,
  maxRepairIterations: 2,
  maxDependencyDepth: 2,
  maxReverseDependencyDepth: 1,
  maxTestDurationSeconds: 120,
};

export const DEFAULT_THOROUGH_BUDGET: ScopeBudget = {
  maxChangedSourceFiles: 40,
  maxAffectedRoutes: 4,
  maxBrowserPages: 4,
  maxScreenshots: 12,
  maxModelCriticCalls: 3,
  maxRepairIterations: 4,
  maxDependencyDepth: 3,
  maxReverseDependencyDepth: 2,
  maxTestDurationSeconds: 300,
};

export const DEFAULT_QUALITY_GATES: QualityGatesConfig = {
  relatedTestsPass: true,
  typeErrorsInScope: 0,
  lintErrorsInScope: 0,
  runtimeErrorsInScope: 0,
  relevantFailedRequests: 0,
  detectedCriticalOverlaps: 0,
  horizontalOverflowInChangedSurface: 0,
  accessibilityCriticalIssues: 0,
  unresolvedCriticalFindings: 0,
  unresolvedHighConfidenceHighSeverityFindings: 0,
  primaryInteractionsPass: true,
};

export const DEFAULT_CONFIG: AutoreviewConfig = {
  baseBranch: "main",
  app: {
    startCommand: "pnpm dev",
    url: "http://localhost:3000",
    readyTimeoutMs: 60_000,
  },
  scope: {
    dependencyDepth: 2,
    reverseDependencyDepth: 1,
    maxRoutes: 2,
    maxScreenshots: 6,
    ignoredFiles: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/*.lock",
      "**/pnpm-lock.yaml",
      "**/package-lock.json",
      "**/yarn.lock",
      "**/bun.lockb",
      "**/.env*",
      "**/coverage/**",
    ],
    ignoredRoutes: [],
    riskExpansionEnabled: true,
  },
  review: {
    mode: "fast",
    maxIterations: 2,
    maxCriticCalls: 1,
  },
  viewports: [
    { name: "mobile", width: 390, height: 844 },
    { name: "desktop", width: 1440, height: 900 },
  ],
  criticalSelectors: ["[data-testid]", "main", "[role='main']"],
  routeMappings: {},
  componentPreviewMappings: {},
  testCommands: {
    unitRelated: "npx vitest related --run",
    lint: "npx eslint",
    typecheck: "npx tsc --noEmit --incremental",
    format: "npx prettier --check",
  },
  qualityGates: DEFAULT_QUALITY_GATES,
  animation: {
    microMinMs: 120,
    microMaxMs: 250,
    componentMinMs: 180,
    componentMaxMs: 450,
    sceneMaxMs: 700,
  },
  screenshotDirectory: ".autoreview/screenshots",
  cacheDirectory: ".autoreview/cache",
  reportDirectory: ".autoreview/reports",
  model: {
    provider: "none",
    maxTokensPerCall: 4000,
    maxCriticCalls: 2,
  },
  stopDependencyPatterns: [
    "node_modules",
    "react",
    "react-dom",
    "next/",
    "vue",
    "@angular/",
    "generated",
    ".next/",
    "dist/",
    "lib/utils",
    "shared/utils",
  ],
  budgets: {
    fast: DEFAULT_FAST_BUDGET,
    thorough: DEFAULT_THOROUGH_BUDGET,
  },
};

export function resolveBudget(config: AutoreviewConfig, mode: ReviewMode): ScopeBudget {
  const base = mode === "thorough" ? config.budgets.thorough : config.budgets.fast;
  return {
    ...base,
    maxDependencyDepth: Math.max(base.maxDependencyDepth, config.scope.dependencyDepth),
    maxReverseDependencyDepth: Math.max(
      base.maxReverseDependencyDepth,
      config.scope.reverseDependencyDepth,
    ),
    maxAffectedRoutes: Math.min(base.maxAffectedRoutes, config.scope.maxRoutes),
    maxScreenshots: Math.min(base.maxScreenshots, config.scope.maxScreenshots),
    maxModelCriticCalls: Math.min(base.maxModelCriticCalls, config.review.maxCriticCalls),
    maxRepairIterations: Math.min(base.maxRepairIterations, config.review.maxIterations),
  };
}
