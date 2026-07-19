import { join } from "node:path";
import { AutoreviewCache } from "../cache/index.js";
import type { AutoreviewConfig } from "../config/defaults.js";
import { resolveBudget } from "../config/defaults.js";
import { runRuntimeVerification, hasRuntimeSurface, resolveBrowserEngines, isResponsiveUiChange } from "../browser/index.js";
import { runCritics } from "../critics/index.js";
import { detectInteractions, runInteractions } from "../interactions/index.js";
import { evaluateQualityGates } from "../quality-gates/index.js";
import { writeReports } from "../reporters/index.js";
import { planScreenshots, captureScreenshots } from "../screenshots/index.js";
import { buildScopeManifest, writeScopeManifest } from "../scope/index.js";
import type {
  AutoreviewCliOptions,
  AutoreviewReport,
  BudgetUsage,
  CheckResult,
  Finding,
  InteractionManifest,
  ReviewMode,
} from "../types.js";
import { runStaticValidation, hasAnimationChanges } from "../validators/index.js";
import {
  buildRepairPlan,
  computeStaleStages,
  shouldTerminateRepairLoop,
  type VerificationStage,
} from "./repair.js";

export interface PipelineResult {
  report: AutoreviewReport;
  manifestPath: string;
  reportPaths: { markdownPath: string; jsonPath: string };
  repairPlanPaths?: string;
}

export async function runAutoreviewPipeline(
  options: AutoreviewCliOptions & { config: AutoreviewConfig },
): Promise<PipelineResult> {
  const cwd = options.cwd ?? process.cwd();
  const config = options.config;
  const mode: ReviewMode = options.mode ?? config.review.mode;
  const maxIterations =
    options.maxIterations ?? config.budgets[mode].maxRepairIterations;
  const taskDescription = options.task ?? "";
  const dryRun = Boolean(options.dryRun);
  const reportOnly = Boolean(options.reportOnly);

  const cache = new AutoreviewCache(join(cwd, config.cacheDirectory));
  let cacheHits = 0;

  const scopeKey = cache.key({
    kind: "scope",
    fileContentHashes: (options.files ?? []).map((f) => cache.hashFile(cwd, f)),
    taskDescription,
    configHash: mode,
  });
  let manifest = cache.get<ReturnType<typeof buildScopeManifest>>(scopeKey);
  if (manifest) {
    cacheHits += 1;
  } else {
    manifest = buildScopeManifest({
      cwd,
      config,
      mode,
      taskDescription,
      explicitFiles: options.files,
      forcedRoutes: options.route,
      baseBranch: options.base,
    });
    cache.set(scopeKey, manifest);
  }

  const manifestPath = writeScopeManifest(cwd, manifest);
  const budget = resolveBudget(config, mode);

  const checksExecuted: CheckResult[] = [];
  const checksSkipped: string[] = [];
  let findings: Finding[] = [];
  let screenshotsCaptured: string[] = [];
  let interactionsTested: InteractionManifest[] = [];
  let modelCallsUsed = 0;
  let estimatedTokensConsumed = 0;
  const fixesApplied: string[] = [];
  let repairIterations = 0;

  let stale = new Set<VerificationStage>([
    "static",
    "tests",
    "runtime",
    "screenshots",
    "critics",
  ]);

  if (reportOnly) {
    stale = new Set();
    checksSkipped.push("All verification stages skipped (--report-only)");
  }

  while (true) {
    if (stale.has("static") || stale.has("tests")) {
      const staticResults = await runStaticValidation({
        cwd,
        config,
        manifest,
        dryRun,
      });
      checksExecuted.push(...staticResults);
      for (const result of staticResults) {
        if (result.findings) findings.push(...result.findings);
      }
      stale.delete("static");
      stale.delete("tests");
    }

    if (stale.has("runtime")) {
      if (!hasRuntimeSurface(manifest)) {
        checksSkipped.push("Runtime verification — no affected routes");
      } else {
        const engines = resolveBrowserEngines({
          mode,
          checks: options.checks,
        });
        if (mode === "fast" && !options.checks?.includes("cross-browser")) {
          checksSkipped.push("Firefox/WebKit — fast mode (explicit --checks cross-browser or --mode thorough required)");
        }
        if (!isResponsiveUiChange(manifest.changedFiles) && mode === "fast") {
          checksSkipped.push("Extra mobile viewport — no responsive UI change detected");
        }
        const runtime = await runRuntimeVerification({
          cwd,
          config,
          manifest,
          dryRun,
          engines,
        });
        checksExecuted.push(...runtime.checks);
        for (const check of runtime.checks) {
          if (check.findings) findings.push(...check.findings);
        }
      }
      stale.delete("runtime");
    }

    const interactions = detectInteractions(manifest, cwd);
    if (interactions.length > 0 && !reportOnly) {
      const interactionRun = await runInteractions({
        interactions: interactions.slice(0, budget.maxBrowserPages),
        baseUrl: config.app.url,
        dryRun,
      });
      interactionsTested = interactionRun.tested;
      findings.push(...interactionRun.findings);
      checksExecuted.push({
        name: "interaction:scoped",
        status: interactionRun.findings.length ? "fail" : "pass",
        durationMs: 0,
        details: `Exercised ${interactionRun.tested.length} scoped interaction(s)`,
      });
    } else {
      checksSkipped.push("Interaction verification — none detected in scope");
    }

    if (stale.has("screenshots") && hasRuntimeSurface(manifest)) {
      const plans = planScreenshots({ cwd, config, manifest });
      if (plans.length > budget.maxScreenshots) {
        checksSkipped.push(
          `Screenshot plan truncated to budget ${budget.maxScreenshots}`,
        );
      }
      screenshotsCaptured = await captureScreenshots({
        plans: plans.slice(0, budget.maxScreenshots),
        config,
        dryRun,
      });
      checksExecuted.push({
        name: "visual:screenshots",
        status: "pass",
        durationMs: 0,
        details: `Captured ${screenshotsCaptured.length} scoped screenshot(s)`,
      });
      stale.delete("screenshots");
    } else if (!hasRuntimeSurface(manifest)) {
      checksSkipped.push("Screenshots — no visual runtime surface");
      stale.delete("screenshots");
    }

    if (!hasAnimationChanges(manifest, cwd)) {
      checksSkipped.push("Animation review — no animation-related changes");
    }

    if (stale.has("critics")) {
      const unresolved = findings.filter((f) => !f.resolved);
      const criticResult = await runCritics({
        config,
        manifest,
        taskDescription,
        screenshots: screenshotsCaptured,
        unresolvedFindings: unresolved,
        dryRun,
      });
      findings.push(...criticResult.findings);
      modelCallsUsed += criticResult.callsUsed;
      estimatedTokensConsumed += criticResult.tokensEstimate;
      checksExecuted.push({
        name: "critics:scoped",
        status: "pass",
        durationMs: 0,
        details: `Model critic calls used: ${criticResult.callsUsed}/${budget.maxModelCriticCalls}`,
      });
      stale.delete("critics");
    }

    // Dedupe findings by id
    const byId = new Map<string, Finding>();
    for (const f of findings) byId.set(f.id, f);
    findings = [...byId.values()];

    const gateEval = evaluateQualityGates({
      gates: config.qualityGates,
      findings,
      checks: checksExecuted,
    });

    if (
      shouldTerminateRepairLoop({
        gatesPassed: gateEval.passed,
        iteration: repairIterations,
        maxIterations,
      })
    ) {
      const budgetUsage: BudgetUsage = {
        changedSourceFiles: manifest.changedFiles.length,
        affectedRoutes: manifest.affectedRoutes.length,
        browserPages: manifest.affectedRoutes.length,
        screenshots: screenshotsCaptured.length,
        modelCriticCalls: modelCallsUsed,
        repairIterations,
        dependencyDepth: budget.maxDependencyDepth,
        testDurationSeconds: Math.round(
          checksExecuted.reduce((sum, c) => sum + c.durationMs, 0) / 1000,
        ),
      };

      const remainingIssues = findings.filter((f) => !f.resolved);
      const report: AutoreviewReport = {
        taskDescription,
        mode,
        changedFiles: manifest.changedFiles,
        affectedComponents: manifest.affectedComponents,
        affectedRoutes: manifest.affectedRoutes,
        scopeReasoning: manifest.scopeReasoning,
        checksExecuted,
        checksSkipped,
        screenshotsCaptured,
        interactionsTested,
        issuesFound: findings,
        fixesApplied,
        remainingIssues,
        scopeExclusions: manifest.excludedFiles,
        expandedItems: manifest.expandedItems,
        budgetUsage,
        modelCallsUsed,
        estimatedTokensConsumed,
        cacheHits,
        qualityGatesPassed: gateEval.passed,
        qualityGateResults: gateEval.results,
        disclaimer:
          "Verification completed for the current task scope. Unrelated routes and repository areas were not inspected.",
        generatedAt: new Date().toISOString(),
      };

      const reportPaths = writeReports(cwd, config.reportDirectory, report);
      return { report, manifestPath, reportPaths };
    }

    // Repair iteration — produce plan for implementation agent; core marks stages stale
    repairIterations += 1;
    const plan = buildRepairPlan(findings);
    fixesApplied.push(
      `Iteration ${repairIterations}: planned ${plan.steps.length} repair step(s)`,
    );
    // Mark high-confidence critical findings as addressed only when dry-run simulation
    // (actual code fixes are applied by the coding agent using the repair plan)
    if (dryRun) {
      for (const finding of findings) {
        if (finding.severity === "low" || finding.severity === "info") {
          finding.resolved = true;
        }
      }
    }
    stale = computeStaleStages(plan.steps);
    if (stale.size === 0) stale.add("static");
  }
}
