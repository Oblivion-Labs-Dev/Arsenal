import { estimateTokens } from "@arsenal/core";

export type BudgetProfileName =
  | "tiny"
  | "small"
  | "balanced"
  | "large"
  | "maximum-quality"
  | "maximum-savings";

export interface BudgetProfile {
  name: BudgetProfileName;
  maxPromptTokens: number;
  maxOutputTokens: number;
  maxContextWindow: number;
  targetSavingsPercent: number;
  expansionLevel: number;
}

export const BUDGET_PROFILES: Record<BudgetProfileName, BudgetProfile> = {
  tiny: {
    name: "tiny",
    maxPromptTokens: 2_000,
    maxOutputTokens: 1_000,
    maxContextWindow: 8_000,
    targetSavingsPercent: 95,
    expansionLevel: 1,
  },
  small: {
    name: "small",
    maxPromptTokens: 4_000,
    maxOutputTokens: 2_000,
    maxContextWindow: 16_000,
    targetSavingsPercent: 90,
    expansionLevel: 2,
  },
  balanced: {
    name: "balanced",
    maxPromptTokens: 12_000,
    maxOutputTokens: 4_000,
    maxContextWindow: 128_000,
    targetSavingsPercent: 85,
    expansionLevel: 2,
  },
  large: {
    name: "large",
    maxPromptTokens: 24_000,
    maxOutputTokens: 8_000,
    maxContextWindow: 200_000,
    targetSavingsPercent: 70,
    expansionLevel: 3,
  },
  "maximum-quality": {
    name: "maximum-quality",
    maxPromptTokens: 48_000,
    maxOutputTokens: 16_000,
    maxContextWindow: 200_000,
    targetSavingsPercent: 40,
    expansionLevel: 4,
  },
  "maximum-savings": {
    name: "maximum-savings",
    maxPromptTokens: 1_500,
    maxOutputTokens: 800,
    maxContextWindow: 8_000,
    targetSavingsPercent: 98,
    expansionLevel: 0,
  },
};

export interface BudgetItem {
  id: string;
  label: string;
  content: string;
  tokens: number;
  priority: number;
}

export interface BudgetEstimate {
  currentPromptTokens: number;
  expectedOutputTokens: number;
  remainingWindow: number;
  estimatedCostUsd: number;
  profile: BudgetProfileName;
  optimizationSuggestions: string[];
  selected: BudgetItem[];
  dropped: BudgetItem[];
}

export interface BudgetManagerOptions {
  profile?: BudgetProfileName;
  modelContextWindow?: number;
  costPer1kTokens?: number;
}

export class BudgetManager {
  private profile: BudgetProfile;

  constructor(options: BudgetManagerOptions = {}) {
    const name = options.profile ?? "balanced";
    this.profile = BUDGET_PROFILES[name];
    if (options.modelContextWindow) {
      this.profile = { ...this.profile, maxContextWindow: options.modelContextWindow };
    }
  }

  getProfile(): BudgetProfile {
    return this.profile;
  }

  setProfile(name: BudgetProfileName): void {
    this.profile = BUDGET_PROFILES[name];
  }

  estimate(promptText: string, expectedOutputRatio = 0.25): BudgetEstimate {
    const currentPromptTokens = estimateTokens(promptText);
    const expectedOutputTokens = Math.min(
      this.profile.maxOutputTokens,
      Math.ceil(currentPromptTokens * expectedOutputRatio),
    );
    const remainingWindow = Math.max(
      0,
      this.profile.maxContextWindow - currentPromptTokens - expectedOutputTokens,
    );
    const costPer1k = 0.003;
    const estimatedCostUsd =
      ((currentPromptTokens + expectedOutputTokens) / 1000) * costPer1k;

    const suggestions: string[] = [];
    if (currentPromptTokens > this.profile.maxPromptTokens) {
      suggestions.push("Prompt exceeds profile budget — enable progressive context levels");
      suggestions.push("Remove duplicate instructions and dead history");
      suggestions.push("Use summaries instead of raw source files");
    }
    if (remainingWindow < this.profile.maxContextWindow * 0.1) {
      suggestions.push("Context window nearly full — switch to maximum-savings profile");
    }

    return {
      currentPromptTokens,
      expectedOutputTokens,
      remainingWindow,
      estimatedCostUsd,
      profile: this.profile.name,
      optimizationSuggestions: suggestions,
      selected: [],
      dropped: [],
    };
  }

  enforce(items: BudgetItem[], maxTokens?: number): { selected: BudgetItem[]; dropped: BudgetItem[]; total: number } {
    const limit = maxTokens ?? this.profile.maxPromptTokens;
    const sorted = [...items].sort((a, b) => b.priority - a.priority);
    const selected: BudgetItem[] = [];
    const dropped: BudgetItem[] = [];
    let total = 0;

    for (const item of sorted) {
      const tokens = item.tokens || estimateTokens(item.content);
      if (total + tokens <= limit) {
        selected.push({ ...item, tokens });
        total += tokens;
      } else {
        dropped.push({ ...item, tokens });
      }
    }
    return { selected, dropped, total };
  }

  suggestProfile(taskComplexity: "easy" | "medium" | "complex" | "refactor"): BudgetProfileName {
    switch (taskComplexity) {
      case "easy":
        return "tiny";
      case "medium":
        return "balanced";
      case "complex":
        return "large";
      case "refactor":
        return "maximum-quality";
    }
  }
}

export function selectProfileForQuery(query: string): BudgetProfileName {
  const lower = query.toLowerCase();
  const words = query.split(/\s+/).length;

  const refactorSignals = /\b(refactor|rewrite|redesign|rearchitect|migration|migrations|overhaul)\b/;
  const complexSignals = /\b(architecture|entire|system-wide|cross-module|security audit|performance)\b/;

  if (refactorSignals.test(lower)) return "maximum-quality";
  if (complexSignals.test(lower) && words >= 5) return "large";
  if (words <= 4) return "tiny";
  if (words <= 8) return "small";
  if (words <= 15) return "balanced";
  if (words <= 25) return "large";
  return "maximum-quality";
}
