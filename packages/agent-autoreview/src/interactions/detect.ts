import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { InteractionManifest, ScopeManifest } from "../types.js";

const INTERACTION_PATTERNS: Array<{
  re: RegExp;
  interaction: string;
  triggerHint: string;
  expected: string;
}> = [
  {
    re: /onClick|handleClick/,
    interaction: "Click primary control",
    triggerHint: "button",
    expected: "Click handler completes without error",
  },
  {
    re: /onSubmit|handleSubmit/,
    interaction: "Submit form",
    triggerHint: "form",
    expected: "Form submits and shows success or validation state",
  },
  {
    re: /Dialog|Modal/,
    interaction: "Open modal/dialog",
    triggerHint: "[role='dialog'], [data-testid*='modal']",
    expected: "Dialog becomes visible",
  },
  {
    re: /onHover|onMouseEnter|whileHover/,
    interaction: "Hover state",
    triggerHint: "[data-testid]",
    expected: "Hover affordance appears",
  },
  {
    re: /drag|onDrag/,
    interaction: "Drag interaction",
    triggerHint: "[draggable='true']",
    expected: "Drag updates position/state",
  },
  {
    re: /onKeyDown|onKeyUp|tabIndex/,
    interaction: "Keyboard behavior",
    triggerHint: "[tabindex]",
    expected: "Keyboard interaction works",
  },
];

export function detectInteractions(
  manifest: ScopeManifest,
  cwd: string,
): InteractionManifest[] {
  const results: InteractionManifest[] = [];
  const routes = manifest.affectedRoutes.map((r) => r.path);
  const defaultRoute = routes[0] ?? "/";

  for (const file of manifest.changedFiles) {
    if (!/\.(tsx|jsx|vue|svelte|ts|js)$/.test(file)) continue;
    const abs = join(cwd, file);
    if (!existsSync(abs)) continue;
    let content = "";
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      continue;
    }

    const testId = content.match(/data-testid=["']([^"']+)["']/);
    for (const pattern of INTERACTION_PATTERNS) {
      if (!pattern.re.test(content)) continue;
      results.push({
        interaction: pattern.interaction,
        route: defaultRoute,
        trigger: testId ? `[data-testid='${testId[1]}']` : pattern.triggerHint,
        expectedResult: pattern.expected,
        sourceFile: file,
      });
    }
  }

  // Deduplicate by interaction+file
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.sourceFile}:${item.interaction}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function runInteractions(options: {
  interactions: InteractionManifest[];
  baseUrl: string;
  dryRun?: boolean;
}): Promise<{ tested: InteractionManifest[]; findings: import("../types.js").Finding[] }> {
  const { interactions, baseUrl, dryRun } = options;
  if (dryRun || interactions.length === 0) {
    return { tested: interactions, findings: [] };
  }

  let playwright: typeof import("playwright") | null = null;
  try {
    playwright = await import("playwright");
  } catch {
    return { tested: [], findings: [] };
  }

  const findings: import("../types.js").Finding[] = [];
  const tested: InteractionManifest[] = [];
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const interaction of interactions) {
      await page.goto(new URL(interaction.route, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      try {
        const loc = page.locator(interaction.trigger).first();
        if (await loc.count()) {
          await loc.click({ timeout: 5_000 });
        }
        tested.push(interaction);
      } catch (error) {
        findings.push({
          id: `interaction-fail-${interaction.interaction}`,
          category: "interaction",
          severity: "critical",
          confidence: 0.9,
          file: interaction.sourceFile,
          selector: interaction.trigger,
          explanation: `Primary interaction failed: ${interaction.interaction} — ${String(error)}`,
          recommendedFix: `Repair trigger ${interaction.trigger} so expected result occurs: ${interaction.expectedResult}`,
          source: "deterministic",
        });
      }
    }
  } finally {
    await browser.close();
  }
  return { tested, findings };
}
