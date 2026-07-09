import { z } from "zod";

export const PolicyRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  enabled: z.boolean().default(true),
  action: z.enum([
    "reject",
    "warn",
    "summarize",
    "compress",
    "graph-first",
    "expand-progressive",
  ]),
  condition: z.enum([
    "file-too-large",
    "duplicate-context",
    "raw-repo-root",
    "missing-graph",
    "log-output",
    "diff-too-large",
    "always",
  ]),
  threshold: z.number().optional(),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const DEFAULT_POLICY_RULES: PolicyRule[] = [
  {
    id: "graph-first",
    description: "Use knowledge graph before reading raw files",
    enabled: true,
    action: "graph-first",
    condition: "always",
  },
  {
    id: "prefer-summaries",
    description: "Prefer summaries over raw source",
    enabled: true,
    action: "expand-progressive",
    condition: "always",
  },
  {
    id: "reject-large-files",
    description: "Reject files over configured size without summary",
    enabled: true,
    action: "summarize",
    condition: "file-too-large",
    threshold: 20_000,
  },
  {
    id: "compress-logs",
    description: "Compress terminal/log output",
    enabled: true,
    action: "compress",
    condition: "log-output",
    threshold: 2_000,
  },
  {
    id: "compress-diffs",
    description: "Summarize diffs larger than threshold",
    enabled: true,
    action: "summarize",
    condition: "diff-too-large",
    threshold: 5_000,
  },
  {
    id: "reject-duplicates",
    description: "Reject duplicated context",
    enabled: true,
    action: "reject",
    condition: "duplicate-context",
  },
];

export interface PolicyContext {
  filePath?: string;
  fileSize?: number;
  content?: string;
  hasGraph?: boolean;
  isLogOutput?: boolean;
  isDiff?: boolean;
  seenHashes?: Set<string>;
}

export interface PolicyViolation {
  ruleId: string;
  description: string;
  action: PolicyRule["action"];
  message: string;
}

export interface PolicyEngineOptions {
  rules?: PolicyRule[];
  plugins?: PolicyPlugin[];
}

export interface PolicyPlugin {
  id: string;
  evaluate(ctx: PolicyContext): PolicyViolation | null;
}

export class PolicyEngine {
  private rules: PolicyRule[];
  private plugins: PolicyPlugin[];

  constructor(options: PolicyEngineOptions = {}) {
    this.rules = options.rules ?? DEFAULT_POLICY_RULES;
    this.plugins = options.plugins ?? [];
  }

  getRules(): PolicyRule[] {
    return [...this.rules];
  }

  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
  }

  registerPlugin(plugin: PolicyPlugin): void {
    this.plugins.push(plugin);
  }

  evaluate(ctx: PolicyContext): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    for (const rule of this.rules.filter((r) => r.enabled)) {
      const v = this.checkRule(rule, ctx);
      if (v) violations.push(v);
    }
    for (const plugin of this.plugins) {
      const v = plugin.evaluate(ctx);
      if (v) violations.push(v);
    }
    return violations;
  }

  getNegativeConstraints(): string[] {
    return [
      "Do not modify unrelated files.",
      "Do not rename existing APIs.",
      "Prefer minimal diff.",
      "Follow repository conventions.",
      "Preserve comments.",
      "No unnecessary dependencies.",
      "Do not load unrelated files.",
      "Never paste entire unrelated files into the prompt.",
    ];
  }

  private checkRule(rule: PolicyRule, ctx: PolicyContext): PolicyViolation | null {
    switch (rule.condition) {
      case "file-too-large":
        if (ctx.fileSize && rule.threshold && ctx.fileSize > rule.threshold) {
          return this.violation(rule, `File exceeds ${rule.threshold} bytes — use summary`);
        }
        break;
      case "duplicate-context": {
        if (ctx.content && ctx.seenHashes) {
          const hash = simpleHash(ctx.content);
          if (ctx.seenHashes.has(hash)) {
            return this.violation(rule, "Duplicate context detected");
          }
          ctx.seenHashes.add(hash);
        }
        break;
      }
      case "log-output":
        if (ctx.isLogOutput && ctx.content && rule.threshold && ctx.content.length > rule.threshold) {
          return this.violation(rule, "Log output too large — compress to errors/warnings only");
        }
        break;
      case "diff-too-large":
        if (ctx.isDiff && ctx.content && rule.threshold && ctx.content.length > rule.threshold) {
          return this.violation(rule, "Diff too large — summarize changes");
        }
        break;
      case "missing-graph":
        if (!ctx.hasGraph) {
          return this.violation(rule, "Knowledge graph missing — run arsenal context graph");
        }
        break;
      default:
        break;
    }
    return null;
  }

  private violation(rule: PolicyRule, message: string): PolicyViolation {
    return { ruleId: rule.id, description: rule.description, action: rule.action, message };
  }
}

function simpleHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return String(h);
}
