import { describe, it, expect } from "vitest";
import { BudgetManager, BUDGET_PROFILES, selectProfileForQuery } from "@arsenal/budget";
import { PolicyEngine } from "@arsenal/policy";
import { PromptCompiler } from "@arsenal/prompt";
import { ContextCompiler } from "@arsenal/context";
import { hybridRetrieve } from "@arsenal/retrieval";
import { summarizeText, deduplicateBlocks } from "@arsenal/summary";
import { isFeatureEnabled, setFeatureFlags } from "@arsenal/core";

describe("AI Context Framework", () => {
  it("budget profiles enforce token limits", () => {
    const mgr = new BudgetManager({ profile: "tiny" });
    const est = mgr.estimate("x".repeat(10_000));
    expect(est.profile).toBe("tiny");
    expect(est.optimizationSuggestions.length).toBeGreaterThan(0);
    expect(BUDGET_PROFILES.balanced.maxPromptTokens).toBe(12_000);
  });

  it("selects profile from query complexity", () => {
    expect(selectProfileForQuery("fix typo")).toBe("tiny");
    expect(selectProfileForQuery("refactor entire authentication module with migrations")).toBe("maximum-quality");
  });

  it("policy engine detects duplicates and large files", () => {
    const engine = new PolicyEngine();
    const seen = new Set<string>();
    engine.evaluate({ content: "same", seenHashes: seen });
    const dup2 = engine.evaluate({ content: "same", seenHashes: seen });
    expect(dup2.some((v) => v.ruleId === "reject-duplicates")).toBe(true);

    const large = engine.evaluate({ fileSize: 50_000, content: "big" });
    expect(large.length).toBeGreaterThan(0);
  });

  it("prompt compiler injects constraints", () => {
    const compiler = new PromptCompiler();
    const result = compiler.compile({
      objective: "Fix OAuth token refresh bug",
      relevantContext: "auth module summary",
    });
    expect(result.markdown).toContain("Objective");
    expect(result.negativeConstraints.length).toBeGreaterThan(3);
    expect(result.profile).toBe("debugging");
  });

  it("context compiler builds progressive context", () => {
    const compiler = new ContextCompiler();
    const result = compiler.compile({
      intent: "fix OAuth token refresh",
      architecture: "# Auth architecture",
      fileSummaries: [
        { path: "src/auth/oauth.ts", purpose: "OAuth token refresh", exports: ["refreshToken"] },
      ],
      budgetProfile: "small",
    });
    expect(result.selectedFiles).toContain("src/auth/oauth.ts");
    expect(result.compiledPrompt.estimatedTokens).toBeGreaterThan(0);
  });

  it("hybrid retrieval ranks by relevance", () => {
    const results = hybridRetrieve({
      query: "OAuth token refresh",
      candidates: [
        { id: "1", path: "src/auth/oauth.ts", text: "OAuth token refresh handler" },
        { id: "2", path: "src/ui/button.tsx", text: "button component styles" },
      ],
    });
    expect(results[0]!.path).toContain("oauth");
  });

  it("summary levels and deduplication work", () => {
    const micro = summarizeText("This is a long sentence about authentication and tokens.", "micro");
    expect(micro.split(/\s+/).length).toBeLessThanOrEqual(51);
    const deduped = deduplicateBlocks(["a", "a", "b"]);
    expect(deduped).toEqual(["a", "b"]);
  });

  it("feature flags toggle components", () => {
    setFeatureFlags({ embeddings: true });
    expect(isFeatureEnabled("embeddings")).toBe(true);
    setFeatureFlags({ embeddings: false });
    expect(isFeatureEnabled("embeddings")).toBe(false);
  });
});
