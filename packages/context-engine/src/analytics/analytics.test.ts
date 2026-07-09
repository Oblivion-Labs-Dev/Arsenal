import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { AnalyticsStore } from "./analytics-store.js";
import { logContextBuild, logAgentEvent } from "./usage-logger.js";
import { calculateSavings } from "./savings-calculator.js";
import { detectStaleKnowledge } from "./stale-knowledge-detector.js";
import { calculateQualityScore } from "./quality-score.js";
import { generateImprovements } from "./improvement-engine.js";
import { aggregateDashboardData } from "../dashboard/dashboard-data.js";
import { runReport } from "../cli/commands/report.js";
import { DEFAULT_CONFIG } from "../schemas/arsenal-config.schema.js";
import type { ContextPackage } from "../core/context-builder.js";
import { initRepoRules } from "../core/init-workspace.js";
import { writeJsonFile } from "../core/file-io.js";
import { arsenalPath } from "../core/paths.js";

describe("analytics", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "arsenal-analytics-"));
    initRepoRules(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("appends JSONL context build records", () => {
    const store = new AnalyticsStore(dir);
    const record = {
      timestamp: new Date().toISOString(),
      taskId: "ctx_test",
      task: "fix auth",
      estimatedContextTokens: 500,
      estimatedFullRepoTokens: 10000,
      estimatedTokensSaved: 9500,
      savingsPercent: 95,
      selectedFiles: ["src/auth.ts"],
      selectedSummaries: ["src/auth.ts"],
      selectedSymbols: ["login"],
      rawFilesLoaded: [],
      decisionsUsed: [],
      pitfallsUsed: [],
      testsSuggested: [],
      modelProfile: "claude",
      contextBudget: 12000,
      budgetUsedPercent: 4.2,
    };
    store.appendContextBuild(record);
    const builds = store.readContextBuilds();
    expect(builds).toHaveLength(1);
    expect(builds[0]!.task).toBe("fix auth");
  });

  it("calculates savings from builds", () => {
    const builds = [
      {
        timestamp: new Date().toISOString(),
        taskId: "a",
        task: "task a",
        estimatedContextTokens: 1000,
        estimatedFullRepoTokens: 20000,
        estimatedTokensSaved: 19000,
        savingsPercent: 95,
        selectedFiles: ["src/a.ts"],
        selectedSummaries: [],
        selectedSymbols: [],
        rawFilesLoaded: [],
        decisionsUsed: [],
        pitfallsUsed: [],
        testsSuggested: [],
        modelProfile: "claude",
        contextBudget: 12000,
        budgetUsedPercent: 8,
      },
    ];
    const savings = calculateSavings(builds, []);
    expect(savings.estimatedTokensSaved).toBe(19000);
    expect(savings.averageSavingsPercent).toBe(95);
  });

  it("detects stale summaries when hash mismatches", () => {
    writeJsonFile(arsenalPath(dir, "repo-map.json"), {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      root: dir,
      projectType: "node",
      stats: { totalFiles: 1, sourceFiles: 1, testFiles: 0, configFiles: 0, docFiles: 0 },
      modules: ["src"],
      files: [{ path: "src/foo.ts", kind: "source", size: 100, hash: "abc123", module: "src" }],
    });
    writeJsonFile(arsenalPath(dir, "summaries/files/src__foo.ts.json"), {
      path: "src/foo.ts",
      purpose: "old",
      exports: [],
      imports: [],
      keySymbols: [],
      sideEffects: [],
      dependsOn: [],
      usedBy: [],
      tests: [],
      risks: [],
      lastHash: "oldhash",
    });
    writeJsonFile(arsenalPath(dir, "cache/hashes.json"), { "src/foo.ts": "abc123" });

    const stale = detectStaleKnowledge(dir);
    expect(stale.staleFiles).toContain("src/foo.ts");
    expect(stale.recommendedCommands).toContain("arsenal context summarize");
  });

  it("calculates quality score", () => {
    const score = calculateQualityScore({
      builds: [
        {
          timestamp: new Date().toISOString(),
          taskId: "x",
          task: "test",
          estimatedContextTokens: 500,
          estimatedFullRepoTokens: 5000,
          estimatedTokensSaved: 4500,
          savingsPercent: 90,
          selectedFiles: ["a.ts", "b.ts", "c.ts"],
          selectedSummaries: ["a.ts"],
          selectedSymbols: [],
          rawFilesLoaded: [],
          decisionsUsed: ["use JWT"],
          pitfallsUsed: [],
          testsSuggested: ["a.test.ts"],
          modelProfile: "claude",
          contextBudget: 12000,
          budgetUsedPercent: 4,
        },
      ],
      events: [],
      stale: {
        generatedAt: "",
        staleFiles: [],
        staleModules: [],
        missingSummaries: [],
        brokenGraphEdges: 0,
        outdatedDecisions: false,
        recommendedCommands: [],
      },
      fileSummaries: [{ path: "a.ts", purpose: "x", exports: [], imports: [], keySymbols: [], sideEffects: [], dependsOn: [], usedBy: [], tests: [], risks: [], lastHash: "h" }],
      config: DEFAULT_CONFIG,
      compactUpdatedRecently: true,
    });
    expect(score.score).toBeGreaterThan(60);
    expect(score.grade).toBeTruthy();
  });

  it("generates improvement suggestions", () => {
    const suggestions = generateImprovements({
      builds: [
        {
          timestamp: new Date().toISOString(),
          taskId: "1",
          task: "auth task",
          estimatedContextTokens: 10000,
          estimatedFullRepoTokens: 20000,
          estimatedTokensSaved: 10000,
          savingsPercent: 50,
          selectedFiles: ["src/auth/token.ts"],
          selectedSummaries: [],
          selectedSymbols: [],
          rawFilesLoaded: [],
          decisionsUsed: [],
          pitfallsUsed: [],
          testsSuggested: [],
          modelProfile: "claude",
          contextBudget: 12000,
          budgetUsedPercent: 85,
        },
        {
          timestamp: new Date().toISOString(),
          taskId: "2",
          task: "auth task 2",
          estimatedContextTokens: 10000,
          estimatedFullRepoTokens: 20000,
          estimatedTokensSaved: 10000,
          savingsPercent: 50,
          selectedFiles: ["src/auth/token.ts"],
          selectedSummaries: [],
          selectedSymbols: [],
          rawFilesLoaded: [],
          decisionsUsed: [],
          pitfallsUsed: [],
          testsSuggested: [],
          modelProfile: "claude",
          contextBudget: 12000,
          budgetUsedPercent: 90,
        },
      ],
      events: [{ timestamp: "", eventType: "FILE_EDITED", file: "src/api/orders.ts" }],
      stale: {
        generatedAt: "",
        staleFiles: ["src/auth/old.ts"],
        staleModules: ["src/auth"],
        missingSummaries: ["src/new.ts"],
        brokenGraphEdges: 0,
        outdatedDecisions: true,
        recommendedCommands: [],
      },
      savings: calculateSavings([], []),
      fileSummaries: [],
      config: DEFAULT_CONFIG,
    });
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("aggregates dashboard data without crashing when logs are empty", () => {
    const data = aggregateDashboardData(dir);
    expect(data.overview.contextBuildsCount).toBe(0);
    expect(data.suggestions).toBeDefined();

    const store = new AnalyticsStore(dir);
    const snapshot = store.readDashboardSnapshot();
    expect(snapshot).toBeTruthy();
    expect(snapshot!.generatedAt).toBeTruthy();
    expect(snapshot!.details.contextBuilds).toEqual([]);
    expect(existsSync(arsenalPath(dir, "analytics/dashboard.json"))).toBe(true);
    expect(existsSync(arsenalPath(dir, "analytics/dashboard-details.json"))).toBe(true);
    expect(existsSync(arsenalPath(dir, "analytics/dashboard.html"))).toBe(true);
  });

  it("generates report output", () => {
    const store = new AnalyticsStore(dir);
    store.appendContextBuild({
      timestamp: new Date().toISOString(),
      taskId: "r1",
      task: "sample task",
      estimatedContextTokens: 3000,
      estimatedFullRepoTokens: 50000,
      estimatedTokensSaved: 47000,
      savingsPercent: 94,
      selectedFiles: [],
      selectedSummaries: [],
      selectedSymbols: [],
      rawFilesLoaded: [],
      decisionsUsed: [],
      pitfallsUsed: [],
      testsSuggested: [],
      modelProfile: "claude",
      contextBudget: 12000,
      budgetUsedPercent: 25,
    });
    const report = runReport(dir);
    expect(report.text).toContain("Arsenal Context Report");
    expect(report.text).toContain("47,000");
  });

  it("logs context build from package", () => {
    const pkg: ContextPackage = {
      query: "fix OAuth",
      interpretation: "fix oauth",
      relevantFiles: ["src/auth/oauth.ts"],
      relevantSymbols: ["refreshToken"],
      summaries: [],
      decisions: [],
      pitfalls: [],
      commands: [],
      testsAffected: [],
      estimatedTokens: 400,
      avoidedTokens: 0,
      maxTokens: 4000,
    };
    writeJsonFile(arsenalPath(dir, "repo-map.json"), {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      root: dir,
      projectType: "node",
      stats: { totalFiles: 1, sourceFiles: 1, testFiles: 0, configFiles: 0, docFiles: 0 },
      modules: [],
      files: [{ path: "src/auth/oauth.ts", kind: "source", size: 4000, hash: "h1" }],
    });
    const record = logContextBuild(dir, pkg, DEFAULT_CONFIG, {
      version: "1.0",
      generatedAt: "",
      root: dir,
      projectType: "node",
      stats: { totalFiles: 1, sourceFiles: 1, testFiles: 0, configFiles: 0, docFiles: 0 },
      modules: [],
      files: [{ path: "src/auth/oauth.ts", kind: "source", size: 4000, hash: "h1" }],
    });
    expect(record.taskId).toMatch(/^ctx_/);
    expect(record.estimatedTokensSaved).toBeGreaterThan(0);
  });

  it("logs agent events", () => {
    logAgentEvent(dir, "FILE_OPENED", { file: "src/x.ts", estimatedTokens: 100 });
    const store = new AnalyticsStore(dir);
    expect(store.readAgentEvents()).toHaveLength(1);
  });
});
