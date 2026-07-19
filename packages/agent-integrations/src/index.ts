import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

function readTemplate(...parts: string[]): string {
  const candidates = [
    join(HERE, "../templates", ...parts),
    join(HERE, "../../templates", ...parts),
    join(HERE, "../../../agent-autoreview/integrations", ...parts),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return readFileSync(c, "utf8");
  }
  return "";
}

export function cursorRule(): string {
  return `---
description: Scoped autoreview workflow
alwaysApply: true
---

# Autoreview

Run scoped validation after implementing a task. Do not crawl unrelated pages.
Do not escalate to thorough/cross-browser unless requested.
`;
}

export function agentsMarkdown(): string {
  return `# Agent instructions

1. Start task session
2. Load relevant memory
3. Implement changes
4. Run fast scoped validation
5. Fix high-confidence findings
6. Re-run invalidated checks
7. Generate completion report
8. Present evidence-based final response
9. Do not run thorough/cross-browser unless requested
10. Do not claim full-site verification
`;
}

export function claudeMarkdown(): string {
  return `# Claude Code\n\n${agentsMarkdown()}`;
}

export function codexInstructions(): string {
  return `# Codex\n\n${agentsMarkdown()}`;
}

export function antigravityInstructions(): string {
  return `# Antigravity\n\n${agentsMarkdown()}`;
}

export const INTEGRATION_TEMPLATES = {
  cursorRule,
  agentsMarkdown,
  claudeMarkdown,
  codexInstructions,
  antigravityInstructions,
  readTemplate,
};
