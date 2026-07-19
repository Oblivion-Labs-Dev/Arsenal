import type { MemoryRule, RetrievedMemory, RetrievalQuery } from "./types.js";
import { loadIndex } from "./store.js";
import { estimateTokens } from "./extract.js";

const LEVEL_PRIORITY: Record<string, number> = {
  repository: 1,
  component: 2,
  route: 3,
  task: 4,
  observation: 5,
};

/**
 * Retrieve only relevant memory — never the entire store.
 * Priority: explicit constraints → component → route → approved decisions → anti-patterns → principles → observations
 */
export function retrieveMemory(cwd: string, query: RetrievalQuery): RetrievedMemory {
  const index = loadIndex(cwd);
  const maxRules = query.maxRules ?? 10;
  const maxAnti = query.maxAntiPatterns ?? 5;
  const maxDecisions = query.maxDecisions ?? 3;
  const maxTokens = query.maxTokens ?? 4000;
  const reasons: string[] = [];

  const components = new Set((query.components ?? []).map((c) => c.toLowerCase()));
  const routes = new Set((query.routes ?? []).map((r) => r.toLowerCase()));
  const tags = new Set((query.tags ?? []).map((t) => t.toLowerCase()));
  const files = (query.files ?? []).map((f) => f.toLowerCase());
  const task = (query.taskText ?? "").toLowerCase();

  const scored = index.rules
    .filter((r) => !r.supersededBy)
    .map((rule) => ({ rule, score: scoreRule(rule, { components, routes, tags, files, task }) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const lp =
        (LEVEL_PRIORITY[a.rule.level] ?? 9) - (LEVEL_PRIORITY[b.rule.level] ?? 9);
      if (lp !== 0) return lp;
      return b.rule.confidence - a.rule.confidence;
    });

  const rules: MemoryRule[] = [];
  let tokens = 0;
  for (const item of scored) {
    if (rules.length >= maxRules) break;
    const cost = estimateTokens(item.rule.text);
    if (tokens + cost > maxTokens) break;
    rules.push(item.rule);
    tokens += cost;
    reasons.push(`${item.rule.id}:${item.score}`);
  }

  const antiPatterns = index.antiPatterns
    .filter((p) => {
      if (!task && components.size === 0) return true;
      const lower = p.toLowerCase();
      return (
        [...components].some((c) => lower.includes(c)) ||
        (task && task.split(/\s+/).some((w) => w.length > 3 && lower.includes(w)))
      );
    })
    .slice(0, maxAnti);

  tokens += antiPatterns.reduce((n, p) => n + estimateTokens(p), 0);

  const decisions = index.decisions
    .filter((d) => {
      if (d.component && components.has(d.component.toLowerCase())) return true;
      if (d.route && routes.has(d.route.toLowerCase())) return true;
      if (task && d.summary.toLowerCase().includes(task.slice(0, 20))) return true;
      return components.size === 0 && routes.size === 0;
    })
    .slice(0, maxDecisions);

  tokens += decisions.reduce((n, d) => n + estimateTokens(d.summary), 0);

  return {
    rules,
    antiPatterns,
    decisions,
    estimatedTokens: Math.min(tokens, maxTokens),
    reasons,
  };
}

function scoreRule(
  rule: MemoryRule,
  ctx: {
    components: Set<string>;
    routes: Set<string>;
    tags: Set<string>;
    files: string[];
    task: string;
  },
): number {
  let score = 0;
  if (rule.explicit) score += 50;
  if (rule.level === "repository") score += 10;
  if (rule.component && ctx.components.has(rule.component.toLowerCase())) score += 40;
  if (rule.route && ctx.routes.has(rule.route.toLowerCase())) score += 35;
  if (rule.tags.some((t) => ctx.tags.has(t.toLowerCase()))) score += 15;
  if (rule.component && ctx.files.some((f) => f.includes(rule.component!.toLowerCase()))) {
    score += 25;
  }
  if (ctx.task && ctx.task.includes(rule.text.toLowerCase().slice(0, 24))) score += 20;
  if (rule.level === "observation" && score === 0) return 0;
  if (score === 0 && rule.level === "repository") score = 5;
  return score;
}

export function formatMemoryForPrompt(memory: RetrievedMemory): string {
  const lines: string[] = ["# Relevant repository memory", ""];
  if (memory.rules.length) {
    lines.push("## Active rules");
    for (const rule of memory.rules) {
      lines.push(`- [${rule.level}/${rule.scope}] ${rule.text}`);
    }
    lines.push("");
  }
  if (memory.antiPatterns.length) {
    lines.push("## Anti-patterns");
    for (const p of memory.antiPatterns) lines.push(`- ${p}`);
    lines.push("");
  }
  if (memory.decisions.length) {
    lines.push("## Recent decisions");
    for (const d of memory.decisions) {
      lines.push(`- ${d.approved ? "approved" : "rejected"}: ${d.summary}`);
    }
  }
  return lines.join("\n");
}
