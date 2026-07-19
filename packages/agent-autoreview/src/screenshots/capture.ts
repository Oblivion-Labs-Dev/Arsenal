import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { AutoreviewConfig } from "../config/defaults.js";
import type { ScopeManifest } from "../types.js";

export interface ScreenshotPlan {
  route: string;
  viewport: string;
  mode: "element" | "section" | "full-page";
  selector?: string;
  reason: string;
  outputPath: string;
}

/**
 * Prefer component/section screenshots over full-page.
 * Never plans screenshots for routes outside the scope.
 */
export function planScreenshots(options: {
  cwd: string;
  config: AutoreviewConfig;
  manifest: ScopeManifest;
}): ScreenshotPlan[] {
  const { cwd, config, manifest } = options;
  const dir = join(cwd, config.screenshotDirectory);
  mkdirSync(dir, { recursive: true });
  const budget = config.budgets[manifest.mode].maxScreenshots;
  const plans: ScreenshotPlan[] = [];

  const viewports =
    needsTablet(manifest) && !config.viewports.some((v) => v.name === "tablet")
      ? [
          ...config.viewports,
          { name: "tablet", width: 768, height: 1024 },
        ]
      : config.viewports;

  for (const route of manifest.affectedRoutes) {
    for (const viewport of viewports) {
      if (plans.length >= budget) break;
      const selector =
        config.criticalSelectors[0] ??
        manifest.affectedComponents[0]?.path.split("/").pop()?.replace(/\.[^.]+$/, "");

      const prefersElement = Boolean(selector);
      const mode = prefersElement
        ? "element"
        : needsFullPage(manifest)
          ? "full-page"
          : "section";

      plans.push({
        route: route.path,
        viewport: viewport.name,
        mode,
        selector: prefersElement ? (config.criticalSelectors[0] ?? "main") : "main",
        reason: `Scoped ${mode} capture for ${route.path} (${route.reason})`,
        outputPath: join(
          dir,
          `${sanitize(route.path)}_${viewport.name}_${mode}.png`,
        ),
      });
    }
  }

  return plans.slice(0, budget);
}

function needsTablet(manifest: ScopeManifest): boolean {
  return manifest.changedFiles.some((f) =>
    /(sm:|md:|lg:|@media|responsive)/i.test(f),
  );
}

function needsFullPage(manifest: ScopeManifest): boolean {
  return manifest.changedFiles.some(
    (f) => /layout\.[jt]sx?$|(global|globals)\.(css|scss)$/.test(f.replace(/\\/g, "/")),
  );
}

function sanitize(route: string): string {
  return route.replace(/[^\w]+/g, "_").replace(/^_|_$/g, "") || "root";
}

export async function captureScreenshots(options: {
  plans: ScreenshotPlan[];
  config: AutoreviewConfig;
  dryRun?: boolean;
}): Promise<string[]> {
  const { plans, config, dryRun } = options;
  if (dryRun || plans.length === 0) return plans.map((p) => p.outputPath);

  let playwright: typeof import("playwright") | null = null;
  try {
    playwright = await import("playwright");
  } catch {
    return [];
  }

  const captured: string[] = [];
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    for (const plan of plans) {
      const viewport =
        config.viewports.find((v) => v.name === plan.viewport) ??
        { width: 1440, height: 900 };
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      await page.goto(new URL(plan.route, config.app.url).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      if (plan.mode === "element" && plan.selector) {
        const loc = page.locator(plan.selector).first();
        if (await loc.count()) {
          await loc.screenshot({ path: plan.outputPath });
        } else {
          await page.locator("main").first().screenshot({ path: plan.outputPath }).catch(async () => {
            await page.screenshot({ path: plan.outputPath, fullPage: false });
          });
        }
      } else if (plan.mode === "full-page") {
        await page.screenshot({ path: plan.outputPath, fullPage: true });
      } else {
        await page.screenshot({ path: plan.outputPath, fullPage: false });
      }
      captured.push(plan.outputPath);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return captured;
}
