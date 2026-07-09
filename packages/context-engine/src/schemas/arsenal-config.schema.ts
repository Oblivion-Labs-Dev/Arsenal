import { z } from "zod";

export const ContextBudgetSchema = z.object({
  defaultMaxTokens: z.number().default(12000),
  smallTaskMaxTokens: z.number().default(4000),
  largeTaskMaxTokens: z.number().default(24000),
});

export const ModelsSchema = z.object({
  default: z.string().default("claude"),
  profiles: z.array(z.string()).default(["claude", "cursor", "openai"]),
});

export const SummaryPolicySchema = z.object({
  maxFileSummaryTokens: z.number().default(250),
  maxModuleSummaryTokens: z.number().default(600),
  includeCodeSnippets: z.boolean().default(false),
});

export const ArsenalConfigSchema = z.object({
  version: z.string().default("1.0"),
  projectType: z.string().default("auto"),
  sourceRoots: z.array(z.string()).default(["src"]),
  testRoots: z.array(z.string()).default(["test", "tests", "__tests__"]),
  docsRoots: z.array(z.string()).default(["docs"]),
  ignore: z
    .array(z.string())
    .default([
      "node_modules",
      ".git",
      "dist",
      "build",
      ".next",
      "coverage",
      ".arsenal/cache",
    ]),
  contextBudget: ContextBudgetSchema.default({}),
  models: ModelsSchema.default({}),
  summaryPolicy: SummaryPolicySchema.default({}),
});

export type ArsenalConfig = z.infer<typeof ArsenalConfigSchema>;

export const DEFAULT_CONFIG: ArsenalConfig = ArsenalConfigSchema.parse({});
