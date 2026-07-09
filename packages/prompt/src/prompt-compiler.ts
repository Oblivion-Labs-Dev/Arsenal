import { BudgetManager, type BudgetProfileName } from "@arsenal/budget";
import { PolicyEngine } from "@arsenal/policy";
import { estimateTokens } from "@arsenal/core";

export type PromptProfileName =
  | "implementation"
  | "debugging"
  | "architecture"
  | "review"
  | "refactor"
  | "performance"
  | "security"
  | "testing"
  | "documentation";

export interface PromptProfile {
  name: PromptProfileName;
  temperature: number;
  verbosity: "minimal" | "balanced" | "detailed";
  budgetProfile: BudgetProfileName;
  outputFormat: string;
  constraints: string[];
}

export const PROMPT_PROFILES: Record<PromptProfileName, PromptProfile> = {
  implementation: {
    name: "implementation",
    temperature: 0.2,
    verbosity: "balanced",
    budgetProfile: "balanced",
    outputFormat: "Minimal diff with file list and risks",
    constraints: ["Prefer targeted edits", "Do not rewrite whole files"],
  },
  debugging: {
    name: "debugging",
    temperature: 0.1,
    verbosity: "detailed",
    budgetProfile: "small",
    outputFormat: "Root cause, fix, verification steps",
    constraints: ["Include reproduction steps", "Mention tests run"],
  },
  architecture: {
    name: "architecture",
    temperature: 0.3,
    verbosity: "detailed",
    budgetProfile: "large",
    outputFormat: "ADR-style decision with tradeoffs",
    constraints: ["Reference existing patterns", "Note migration risks"],
  },
  review: {
    name: "review",
    temperature: 0.2,
    verbosity: "balanced",
    budgetProfile: "balanced",
    outputFormat: "Bulleted findings by severity",
    constraints: ["No drive-by refactors"],
  },
  refactor: {
    name: "refactor",
    temperature: 0.2,
    verbosity: "detailed",
    budgetProfile: "maximum-quality",
    outputFormat: "Plan, incremental steps, rollback notes",
    constraints: ["Preserve behavior", "Keep diffs reviewable"],
  },
  performance: {
    name: "performance",
    temperature: 0.1,
    verbosity: "balanced",
    budgetProfile: "balanced",
    outputFormat: "Bottleneck, change, expected impact",
    constraints: ["Measure before/after when possible"],
  },
  security: {
    name: "security",
    temperature: 0.1,
    verbosity: "detailed",
    budgetProfile: "balanced",
    outputFormat: "Threat, mitigation, residual risk",
    constraints: ["No secrets in output", "Follow least privilege"],
  },
  testing: {
    name: "testing",
    temperature: 0.2,
    verbosity: "balanced",
    budgetProfile: "small",
    outputFormat: "Test cases, commands, coverage notes",
    constraints: ["Prefer unit tests first"],
  },
  documentation: {
    name: "documentation",
    temperature: 0.3,
    verbosity: "detailed",
    budgetProfile: "small",
    outputFormat: "Clear prose with examples",
    constraints: ["Match repo doc style"],
  },
};

export interface CompiledPromptInput {
  objective: string;
  profile?: PromptProfileName;
  repositoryRules?: string[];
  codingStandards?: string[];
  relevantContext: string;
  acceptanceCriteria?: string[];
  budgetProfile?: BudgetProfileName;
}

export interface CompiledPrompt {
  markdown: string;
  profile: PromptProfileName;
  estimatedTokens: number;
  budgetEstimate: ReturnType<BudgetManager["estimate"]>;
  negativeConstraints: string[];
}

export class PromptCompiler {
  private policy = new PolicyEngine();

  compile(input: CompiledPromptInput): CompiledPrompt {
    const profileName = input.profile ?? inferProfile(input.objective);
    const profile = PROMPT_PROFILES[profileName];
    const budget = new BudgetManager({ profile: input.budgetProfile ?? profile.budgetProfile });
    const negativeConstraints = this.policy.getNegativeConstraints();

    const sections = [
      `# Objective\n${input.objective}`,
      `## Profile\n${profile.name} (verbosity: ${profile.verbosity}, temp: ${profile.temperature})`,
      input.repositoryRules?.length
        ? `## Repository Rules\n${input.repositoryRules.map((r) => `- ${r}`).join("\n")}`
        : "",
      input.codingStandards?.length
        ? `## Coding Standards\n${input.codingStandards.map((s) => `- ${s}`).join("\n")}`
        : "",
      `## Relevant Context\n${input.relevantContext}`,
      `## Negative Constraints\n${negativeConstraints.map((c) => `- ${c}`).join("\n")}`,
      `## Output Format\n${profile.outputFormat}`,
      profile.constraints.length
        ? `## Profile Constraints\n${profile.constraints.map((c) => `- ${c}`).join("\n")}`
        : "",
      input.acceptanceCriteria?.length
        ? `## Acceptance Criteria\n${input.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}`
        : "",
      `## Token Budget\nProfile: ${profile.budgetProfile}`,
    ].filter(Boolean);

    const markdown = sections.join("\n\n");
    const budgetEstimate = budget.estimate(markdown);

    return {
      markdown,
      profile: profileName,
      estimatedTokens: estimateTokens(markdown),
      budgetEstimate,
      negativeConstraints,
    };
  }
}

function inferProfile(objective: string): PromptProfileName {
  const lower = objective.toLowerCase();
  if (/debug|fix|bug|error|fail/.test(lower)) return "debugging";
  if (/architect|design|adr/.test(lower)) return "architecture";
  if (/review|audit/.test(lower)) return "review";
  if (/refactor/.test(lower)) return "refactor";
  if (/perf|slow|latency/.test(lower)) return "performance";
  if (/security|auth|vuln/.test(lower)) return "security";
  if (/test|spec|coverage/.test(lower)) return "testing";
  if (/doc|readme/.test(lower)) return "documentation";
  return "implementation";
}
