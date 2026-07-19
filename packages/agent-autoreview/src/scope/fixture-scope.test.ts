import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { buildDependencyGraph } from "../dependency-graph/build-graph.js";
import { DEFAULT_CONFIG } from "../config/defaults.js";
import { mapAffectedRoutes, extractPagesRouterPath } from "../route-mapper/map-routes.js";
import { buildScopeManifest } from "./build-scope.js";
import { planScreenshots } from "../screenshots/capture.js";
import { AutoreviewCache, hashContent } from "../cache/store.js";
import { evaluateQualityGates } from "../quality-gates/evaluate.js";
import {
  buildRepairPlan,
  shouldTerminateRepairLoop,
  computeStaleStages,
} from "../pipeline/repair.js";
import { CriticBudget, NullCriticProvider } from "../critics/provider.js";
import { runDeterministicVisualChecks } from "../validators/visual-deterministic.js";
import { selectRelatedTests } from "../validators/static.js";
import { writeReports } from "../reporters/report.js";
import type { AutoreviewReport } from "../types.js";
import { parseAutoreviewArgs } from "../cli/parse-args.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "../../fixtures/mini-frontend");

describe("dependency depth limiting", () => {
  it("does not traverse beyond max depth", () => {
    const dir = mkdtempSync(join(tmpdir(), "dep-"));
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src/a.ts"), `import { b } from "./b";\nexport const a = b;\n`);
      writeFileSync(join(dir, "src/b.ts"), `import { c } from "./c";\nexport const b = c;\n`);
      writeFileSync(join(dir, "src/c.ts"), `export const c = 1;\n`);
      writeFileSync(join(dir, "src/d.ts"), `export const d = 1;\n`);

      const graph = buildDependencyGraph(["src/a.ts"], dir, DEFAULT_CONFIG, 1);
      expect(graph.files.has("src/a.ts")).toBe(true);
      expect(graph.files.has("src/b.ts")).toBe(true);
      expect(graph.files.has("src/c.ts")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("route mapping", () => {
  it("extracts pages router paths", () => {
    expect(extractPagesRouterPath("src/pages/components.tsx")).toBe("/components");
    expect(extractPagesRouterPath("src/pages/index.tsx")).toBe("/");
  });

  it("maps changed Card to /components via filesystem imports", () => {
    const routes = mapAffectedRoutes(
      ["src/components/Card.tsx"],
      FIXTURE,
      {
        ...DEFAULT_CONFIG,
        routeMappings: {
          "/components": ["src/components/Card.tsx"],
        },
      },
    );
    expect(routes.some((r) => r.path === "/components")).toBe(true);
    expect(routes.every((r) => r.reason.length > 0)).toBe(true);
  });
});

describe("fixture frontend scoping", () => {
  it("includes only affected routes for Card change — not about/home by default", () => {
    const manifest = buildScopeManifest({
      cwd: FIXTURE,
      config: {
        ...DEFAULT_CONFIG,
        routeMappings: {
          "/components": ["src/components/Card.tsx"],
        },
      },
      mode: "fast",
      taskDescription: "Update Card click",
      explicitFiles: ["src/components/Card.tsx", "src/styles/card.css"],
    });

    expect(manifest.changedFiles).toContain("src/components/Card.tsx");
    expect(manifest.affectedRoutes.map((r) => r.path)).toContain("/components");
    expect(manifest.affectedRoutes.map((r) => r.path)).not.toContain("/about");
    const plans = planScreenshots({
      cwd: FIXTURE,
      config: DEFAULT_CONFIG,
      manifest,
    });
    expect(plans.every((p) => p.route === "/components")).toBe(true);
    expect(plans.length).toBeLessThanOrEqual(DEFAULT_CONFIG.budgets.fast.maxScreenshots);
  });

  it("respects screenshot and route budgets", () => {
    const manifest = buildScopeManifest({
      cwd: FIXTURE,
      config: {
        ...DEFAULT_CONFIG,
        scope: { ...DEFAULT_CONFIG.scope, maxRoutes: 1, maxScreenshots: 2 },
        routeMappings: {
          "/components": ["src/components/Card.tsx"],
          "/": ["src/components/Card.tsx"],
          "/about": ["src/components/Card.tsx"],
        },
      },
      mode: "fast",
      explicitFiles: ["src/components/Card.tsx"],
    });
    expect(manifest.affectedRoutes.length).toBeLessThanOrEqual(1);
  });
});

describe("cache invalidation", () => {
  it("stores and invalidates by key", () => {
    const dir = mkdtempSync(join(tmpdir(), "cache-"));
    try {
      const cache = new AutoreviewCache(join(dir, "cache"));
      const key = cache.key({ kind: "screenshot", route: "/components", viewport: "desktop" });
      cache.set(key, { ok: true });
      expect(cache.get<{ ok: boolean }>(key)?.ok).toBe(true);
      cache.invalidate(key);
      expect(cache.get(key)).toBeNull();
      expect(hashContent("abc")).toHaveLength(16);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("quality gates and repair loop", () => {
  it("fails on unresolved critical findings", () => {
    const result = evaluateQualityGates({
      gates: DEFAULT_CONFIG.qualityGates,
      findings: [
        {
          id: "overlap-1",
          category: "visual",
          severity: "critical",
          confidence: 0.95,
          explanation: "overlap",
          recommendedFix: "fix",
          source: "deterministic",
        },
      ],
      checks: [],
    });
    expect(result.passed).toBe(false);
    expect(result.blocking.length).toBeGreaterThan(0);
  });

  it("terminates when gates pass or iterations exhausted", () => {
    expect(
      shouldTerminateRepairLoop({ gatesPassed: true, iteration: 0, maxIterations: 2 }),
    ).toBe(true);
    expect(
      shouldTerminateRepairLoop({ gatesPassed: false, iteration: 2, maxIterations: 2 }),
    ).toBe(true);
    expect(
      shouldTerminateRepairLoop({ gatesPassed: false, iteration: 1, maxIterations: 2 }),
    ).toBe(false);
  });

  it("marks CSS-only repairs as screenshot-stale", () => {
    const plan = buildRepairPlan([
      {
        id: "v1",
        category: "visual",
        severity: "high",
        confidence: 0.9,
        explanation: "spacing",
        recommendedFix: "adjust padding",
        source: "deterministic",
        file: "src/styles/card.css",
      },
    ]);
    const stale = computeStaleStages(plan.steps);
    expect(stale.has("screenshots")).toBe(true);
    expect(stale.has("tests")).toBe(false);
  });
});

describe("model-call budgeting", () => {
  it("does not exceed max critic calls", async () => {
    const budget = new CriticBudget(new NullCriticProvider(), 2);
    await budget.run({
      role: "visual",
      taskDescription: "t",
      changedFilesSummary: "a",
      scopeExcerpt: "{}",
    });
    await budget.run({
      role: "adversarial",
      taskDescription: "t",
      changedFilesSummary: "a",
      scopeExcerpt: "{}",
    });
    await budget.run({
      role: "visual",
      taskDescription: "t",
      changedFilesSummary: "a",
      scopeExcerpt: "{}",
    });
    expect(budget.callsUsed).toBe(2);
    expect(budget.remaining()).toBe(0);
  });
});

describe("deterministic visual checks", () => {
  it("detects horizontal overflow and overlaps", () => {
    const findings = runDeterministicVisualChecks(
      {
        viewportWidth: 390,
        viewportHeight: 844,
        scrollWidth: 500,
        scrollHeight: 844,
        elements: [
          {
            selector: "button:1",
            tag: "button",
            rect: { x: 0, y: 0, width: 50, height: 50, top: 0, left: 0, bottom: 50, right: 50 },
            visible: true,
            focusable: true,
            hasFocusIndicator: true,
            zIndex: 1,
            isInteractive: true,
            clientWidth: 50,
            clientHeight: 50,
          },
          {
            selector: "button:2",
            tag: "button",
            rect: { x: 10, y: 10, width: 50, height: 50, top: 10, left: 10, bottom: 60, right: 60 },
            visible: true,
            focusable: true,
            hasFocusIndicator: true,
            zIndex: 1,
            isInteractive: true,
            clientWidth: 50,
            clientHeight: 50,
          },
        ],
        imageStatuses: [],
      },
      "/components",
    );
    expect(findings.some((f) => f.id.includes("overflow"))).toBe(true);
    expect(findings.some((f) => f.id.includes("overlap"))).toBe(true);
  });
});

describe("test selection and report generation", () => {
  it("selects related tests from manifest", () => {
    const tests = selectRelatedTests({
      changedFiles: ["src/components/Card.tsx"],
      affectedComponents: [],
      affectedRoutes: [],
      affectedTests: [{ path: "src/components/Card.test.tsx", reason: "associated" }],
      affectedInteractions: [],
      supportingFiles: [],
      excludedFiles: [],
      expandedItems: [],
      scopeReasoning: {},
      generatedAt: new Date().toISOString(),
      mode: "fast",
      source: "explicit-files",
    });
    expect(tests).toContain("src/components/Card.test.tsx");
  });

  it("writes markdown and json reports", () => {
    const dir = mkdtempSync(join(tmpdir(), "report-"));
    try {
      const report: AutoreviewReport = {
        taskDescription: "Update Card",
        mode: "fast",
        changedFiles: ["src/components/Card.tsx"],
        affectedComponents: [
          { path: "src/components/Card.tsx", reason: "Directly changed" },
        ],
        affectedRoutes: [{ path: "/components", reason: "Configured mapping" }],
        scopeReasoning: { "route:/components": "Configured mapping" },
        checksExecuted: [],
        checksSkipped: ["Unrelated /about"],
        screenshotsCaptured: [],
        interactionsTested: [],
        issuesFound: [],
        fixesApplied: [],
        remainingIssues: [],
        scopeExclusions: [],
        expandedItems: [],
        budgetUsage: {
          changedSourceFiles: 1,
          affectedRoutes: 1,
          browserPages: 1,
          screenshots: 0,
          modelCriticCalls: 0,
          repairIterations: 0,
          dependencyDepth: 2,
          testDurationSeconds: 0,
        },
        modelCallsUsed: 0,
        estimatedTokensConsumed: 0,
        cacheHits: 0,
        qualityGatesPassed: true,
        qualityGateResults: { relatedTestsPass: true },
        disclaimer:
          "Verification completed for the current task scope. Unrelated routes and repository areas were not inspected.",
        generatedAt: new Date().toISOString(),
      };
      const paths = writeReports(dir, "reports", report);
      expect(paths.markdownPath).toContain("latest.md");
      expect(paths.jsonPath).toContain("latest.json");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("CLI parsing", () => {
  it("parses flags", () => {
    const parsed = parseAutoreviewArgs([
      "autoreview",
      "--task",
      "Fix card",
      "--mode",
      "thorough",
      "--files",
      "src/a.tsx",
      "src/b.tsx",
      "--dry-run",
      "--route",
      "/components",
    ]);
    expect(parsed.options.task).toBe("Fix card");
    expect(parsed.options.mode).toBe("thorough");
    expect(parsed.options.files).toEqual(["src/a.tsx", "src/b.tsx"]);
    expect(parsed.options.dryRun).toBe(true);
    expect(parsed.options.route).toEqual(["/components"]);
  });
});
