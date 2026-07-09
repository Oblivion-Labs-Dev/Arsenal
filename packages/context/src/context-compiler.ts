import { ContextLevel, estimateTokens, scoreText, tokenizeQuery } from "@arsenal/core";
import { BudgetManager, type BudgetItem } from "@arsenal/budget";
import { PolicyEngine } from "@arsenal/policy";
import { PromptCompiler } from "@arsenal/prompt";

export interface ContextCompilerInput {
  intent: string;
  architecture?: string;
  moduleSummaries?: { path: string; summary: string }[];
  fileSummaries?: FileSummaryInput[];
  symbols?: string[];
  dependencies?: string[];
  tests?: string[];
  decisions?: string[];
  pitfalls?: string[];
  documentation?: string[];
  expansionLevel?: ContextLevel;
  budgetProfile?: import("@arsenal/budget").BudgetProfileName;
}

export interface FileSummaryInput {
  path: string;
  purpose: string;
  exports?: string[];
  hash?: string;
  size?: number;
}

export interface CompiledContext {
  intent: string;
  expansionLevel: ContextLevel;
  selectedFiles: string[];
  selectedSymbols: string[];
  contextMarkdown: string;
  compiledPrompt: ReturnType<PromptCompiler["compile"]>;
  estimatedTokens: number;
  policyViolations: ReturnType<PolicyEngine["evaluate"]>;
  droppedItems: string[];
}

export class ContextCompiler {
  private budget = new BudgetManager();
  private policy = new PolicyEngine();
  private promptCompiler = new PromptCompiler();

  compile(input: ContextCompilerInput): CompiledContext {
    if (input.budgetProfile) this.budget.setProfile(input.budgetProfile);

    const level = input.expansionLevel ?? inferExpansionLevel(input.intent);
    const terms = tokenizeQuery(input.intent);
    const seenHashes = new Set<string>();

    const items: BudgetItem[] = [
      { id: "intent", label: "intent", content: input.intent, tokens: estimateTokens(input.intent), priority: 100 },
    ];

    if (input.architecture && level >= ContextLevel.Architecture) {
      items.push({
        id: "arch",
        label: "architecture",
        content: input.architecture,
        tokens: estimateTokens(input.architecture),
        priority: 90,
      });
    }

    const scoredFiles = (input.fileSummaries ?? [])
      .map((f) => ({
        file: f,
        score: scoreText(`${f.path} ${f.purpose} ${(f.exports ?? []).join(" ")}`, terms),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    const minLevel = level;
    for (const { file } of scoredFiles) {
      if (minLevel < ContextLevel.Function) continue;
      const content = JSON.stringify({
        path: file.path,
        purpose: file.purpose,
        exports: file.exports,
      });
      const violation = this.policy.evaluate({
        filePath: file.path,
        fileSize: file.size,
        content,
        seenHashes,
        hasGraph: true,
      });
      if (violation.some((v) => v.action === "reject")) continue;
      items.push({
        id: `file:${file.path}`,
        label: file.path,
        content,
        tokens: estimateTokens(content),
        priority: 70,
      });
    }

    for (const mod of input.moduleSummaries ?? []) {
      if (level < ContextLevel.Module) continue;
      items.push({
        id: `mod:${mod.path}`,
        label: mod.path,
        content: mod.summary,
        tokens: estimateTokens(mod.summary),
        priority: 75,
      });
    }

    const enforced = this.budget.enforce(items);
    const contextMarkdown = enforced.selected.map((i) => `### ${i.label}\n${i.content}`).join("\n\n");

    const compiledPrompt = this.promptCompiler.compile({
      objective: input.intent,
      relevantContext: contextMarkdown,
      repositoryRules: input.decisions,
      codingStandards: input.pitfalls,
      budgetProfile: input.budgetProfile,
    });

    return {
      intent: input.intent,
      expansionLevel: level,
      selectedFiles: scoredFiles.slice(0, 15).map((s) => s.file.path),
      selectedSymbols: input.symbols ?? [],
      contextMarkdown,
      compiledPrompt,
      estimatedTokens: estimateTokens(contextMarkdown),
      policyViolations: [],
      droppedItems: enforced.dropped.map((d) => d.label),
    };
  }
}

function inferExpansionLevel(intent: string): ContextLevel {
  const lower = intent.toLowerCase();
  if (/refactor|migrate|architect|redesign/.test(lower)) return ContextLevel.Architecture;
  if (/module|feature|add/.test(lower)) return ContextLevel.Module;
  if (/fix|bug|function|method/.test(lower)) return ContextLevel.Function;
  if (/rename|typo|line/.test(lower)) return ContextLevel.Function;
  return ContextLevel.Module;
}

export { ContextLevel };
