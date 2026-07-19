import type { AutoreviewConfig } from "../config/defaults.js";
import type { CheckResult, Finding, ScopeManifest } from "../types.js";
import {
  DETERMINISTIC_SNAPSHOT_SCRIPT,
  runDeterministicVisualChecks,
  type DeterministicVisualSnapshot,
} from "../validators/visual-deterministic.js";

export interface BrowserPageResult {
  route: string;
  consoleErrors: string[];
  failedRequests: string[];
  hydrationErrors: string[];
  renderedSelectors: string[];
  snapshot?: DeterministicVisualSnapshot;
}

export interface RuntimeVerificationResult {
  checks: CheckResult[];
  pages: BrowserPageResult[];
  visitedRoutes: string[];
}

/**
 * Runtime verification adapter. Uses Playwright when available; otherwise
 * returns a structured skip with clear scope (no unrelated crawling).
 */
export async function runRuntimeVerification(options: {
  cwd: string;
  config: AutoreviewConfig;
  manifest: ScopeManifest;
  dryRun?: boolean;
  engines?: Array<"chromium" | "firefox" | "webkit">;
}): Promise<RuntimeVerificationResult> {
  const { config, manifest, dryRun } = options;
  const engines = options.engines ?? ["chromium"];
  const routes = manifest.affectedRoutes.map((r) => r.path);
  const visitedRoutes: string[] = [];

  if (routes.length === 0) {
    return {
      checks: [
        {
          name: "runtime:no-surface",
          status: "skip",
          durationMs: 0,
          details: "No runtime surface in scope — app not started",
        },
      ],
      pages: [],
      visitedRoutes,
    };
  }

  if (dryRun) {
    return {
      checks: [
        {
          name: "runtime:dry-run",
          status: "skip",
          durationMs: 0,
          details: `Would visit only: ${routes.join(", ")} on ${engines.join(", ")}`,
        },
      ],
      pages: [],
      visitedRoutes: routes,
    };
  }

  let playwright: typeof import("playwright") | null = null;
  try {
    playwright = await import("playwright");
  } catch {
    return {
      checks: [
        {
          name: "runtime:playwright-missing",
          status: "skip",
          durationMs: 0,
          details:
            "Playwright not installed — skipped browser verification. Install playwright to enable.",
        },
      ],
      pages: [],
      visitedRoutes: [],
    };
  }

  const budgetPages = config.budgets[manifest.mode].maxBrowserPages;
  const limitedRoutes = routes.slice(0, budgetPages);
  const pages: BrowserPageResult[] = [];
  const findings: Finding[] = [];
  const started = Date.now();
  const enginesUsed: string[] = [];

  for (const engine of engines) {
    const launcher =
      engine === "firefox"
        ? playwright.firefox
        : engine === "webkit"
          ? playwright.webkit
          : playwright.chromium;
    enginesUsed.push(engine);
    const browser = await launcher.launch({ headless: true });
    try {
      const context = await browser.newContext({
        viewport: config.viewports.find((v) => v.name === "desktop") ?? {
          width: 1440,
          height: 900,
        },
      });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      const hydrationErrors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => {
        const text = String(err);
        if (/hydrat/i.test(text)) hydrationErrors.push(text);
        else consoleErrors.push(text);
      });
      page.on("requestfailed", (req) => {
        failedRequests.push(`${req.failure()?.errorText ?? "failed"} ${req.url()}`);
      });

      for (const route of limitedRoutes) {
        if (!visitedRoutes.includes(route)) visitedRoutes.push(route);
        const routeConsole: string[] = [];
        consoleErrors.length = 0;
        failedRequests.length = 0;
        hydrationErrors.length = 0;

        const url = new URL(route, config.app.url).toString();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await page.waitForTimeout(300);

        routeConsole.push(...consoleErrors);

        const snapshot = (await page.evaluate(
          DETERMINISTIC_SNAPSHOT_SCRIPT,
        )) as DeterministicVisualSnapshot;
        const renderedSelectors = snapshot.elements
          .filter((e) => e.visible)
          .map((e) => e.selector)
          .slice(0, 20);

        for (const err of routeConsole) {
          findings.push({
            id: `runtime-console-${engine}-${route}`,
            category: "runtime",
            severity: "high",
            confidence: 0.95,
            explanation: `Console error on ${route} (${engine}): ${err}`,
            recommendedFix: "Fix runtime exception in scoped route",
            source: "deterministic",
          });
        }
        for (const err of hydrationErrors) {
          findings.push({
            id: `runtime-hydration-${engine}-${route}`,
            category: "runtime",
            severity: "critical",
            confidence: 1,
            explanation: `Hydration error on ${route} (${engine}): ${err}`,
            recommendedFix: "Align server/client render output for changed components",
            source: "deterministic",
          });
        }

        // Deterministic visual checks run on Chromium primary pass only
        if (engine === "chromium") {
          const visualFindings = runDeterministicVisualChecks(snapshot, route);
          findings.push(...visualFindings);
        }

        pages.push({
          route,
          consoleErrors: routeConsole,
          failedRequests: [...failedRequests],
          hydrationErrors: [...hydrationErrors],
          renderedSelectors,
          snapshot: engine === "chromium" ? snapshot : undefined,
        });
      }

      await context.close();
    } finally {
      await browser.close();
    }
  }

  // Budget enforcement: never visit routes outside limited set
  const unauthorized = visitedRoutes.filter((r) => !limitedRoutes.includes(r));
  if (unauthorized.length > 0) {
    findings.push({
      id: "scope-violation",
      category: "scope",
      severity: "critical",
      confidence: 1,
      explanation: `Visited routes outside scope budget: ${unauthorized.join(", ")}`,
      recommendedFix: "Restrict browser navigation to affectedRoutes only",
      source: "deterministic",
    });
  }

  return {
    checks: [
      {
        name: "runtime:scoped-routes",
        status: findings.some((f) => f.severity === "critical" || f.severity === "high")
          ? "fail"
          : "pass",
        durationMs: Date.now() - started,
        details: `Visited ${visitedRoutes.length} scoped route(s) on ${enginesUsed.join(", ")}: ${visitedRoutes.join(", ")}`,
        findings,
      },
    ],
    pages,
    visitedRoutes,
  };
}

export function hasRuntimeSurface(manifest: ScopeManifest): boolean {
  return manifest.affectedRoutes.length > 0;
}
