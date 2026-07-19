import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AutoreviewConfig } from "../config/defaults.js";
import type { CriticInput, CriticProvider, Finding, ScopeManifest } from "../types.js";

function promptsDir(): string {
  // Prefer package prompts/ next to dist or src
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "../../prompts"),
    join(here, "../../../prompts"),
    join(process.cwd(), "packages/agent-autoreview/prompts"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0]!;
}

export function loadPrompt(name: string): string {
  const path = join(promptsDir(), name);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

export class NullCriticProvider implements CriticProvider {
  name = "none";
  async review(_input: CriticInput): Promise<Finding[]> {
    return [];
  }
}

/**
 * Budget-aware critic runner. Never exceeds maxModelCriticCalls.
 * Only invokes visual critic when UI changed.
 */
export class CriticBudget {
  private used = 0;
  private estimatedTokens = 0;

  constructor(
    private readonly provider: CriticProvider,
    private readonly maxCalls: number,
  ) {}

  get callsUsed(): number {
    return this.used;
  }

  get tokensEstimate(): number {
    return this.estimatedTokens;
  }

  remaining(): number {
    return Math.max(0, this.maxCalls - this.used);
  }

  async run(input: CriticInput): Promise<Finding[]> {
    if (this.used >= this.maxCalls) return [];
    this.used += 1;
    const approx =
      (input.taskDescription.length +
        input.changedFilesSummary.length +
        input.scopeExcerpt.length) /
      4;
    this.estimatedTokens += Math.ceil(approx) + (input.maxTokens ?? 1000);
    return this.provider.review(input);
  }
}

export function createCriticProvider(config: AutoreviewConfig): CriticProvider {
  if (config.model.provider === "none") return new NullCriticProvider();
  return new NullCriticProvider();
}

export function shouldRunVisualCritic(manifest: ScopeManifest): boolean {
  return manifest.changedFiles.some((f) =>
    /\.(tsx|jsx|vue|svelte|css|scss|sass|less)$/.test(f),
  );
}

export async function runCritics(options: {
  config: AutoreviewConfig;
  manifest: ScopeManifest;
  taskDescription: string;
  screenshots: string[];
  unresolvedFindings: Finding[];
  dryRun?: boolean;
}): Promise<{ findings: Finding[]; callsUsed: number; tokensEstimate: number }> {
  const { config, manifest, taskDescription, screenshots, unresolvedFindings, dryRun } = options;
  const budget = new CriticBudget(
    createCriticProvider(config),
    config.budgets[manifest.mode].maxModelCriticCalls,
  );

  if (dryRun || budget.remaining() === 0) {
    return { findings: [], callsUsed: 0, tokensEstimate: 0 };
  }

  const findings: Finding[] = [];
  const changedFilesSummary = manifest.changedFiles.slice(0, 30).join("\n");
  const scopeExcerpt = JSON.stringify(
    {
      routes: manifest.affectedRoutes,
      components: manifest.affectedComponents.slice(0, 20),
    },
    null,
    2,
  );

  if (shouldRunVisualCritic(manifest) && screenshots.length > 0 && unresolvedFindings.length > 0) {
    const visual = await budget.run({
      role: "visual",
      taskDescription,
      changedFilesSummary,
      scopeExcerpt,
      screenshots: screenshots.slice(0, 4),
      maxTokens: config.model.maxTokensPerCall,
    });
    findings.push(...visual);
  }

  if (budget.remaining() > 0) {
    const adversarial = await budget.run({
      role: "adversarial",
      taskDescription,
      changedFilesSummary,
      scopeExcerpt,
      maxTokens: config.model.maxTokensPerCall,
    });
    findings.push(...adversarial);
  }

  return {
    findings,
    callsUsed: budget.callsUsed,
    tokensEstimate: budget.tokensEstimate,
  };
}
