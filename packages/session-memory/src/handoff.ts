import { arsenalPath, readTextFile, writeTextFile } from "@arsenal/core";

export interface SessionState {
  goal: string;
  completed: string[];
  remaining: string[];
  modifiedFiles: string[];
  decisions: string[];
  constraints: string[];
  openIssues: string[];
}

export interface HandoffDocument {
  markdown: string;
  recommendedNextPrompt: string;
}

export function parseActiveTask(content: string): SessionState {
  const sections: Record<string, string[]> = {};
  let current = "goal";
  sections[current] = [];

  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith("#")) {
      current = line.replace(/^#+\s*/, "").toLowerCase();
      sections[current] = [];
      continue;
    }
    const t = line.trim();
    if (!t) continue;
    if (!sections[current]) sections[current] = [];
    sections[current].push(t.startsWith("-") ? t.replace(/^\s*-\s*/, "") : t);
  }

  return {
    goal: (sections.goal ?? sections.general ?? []).join("\n"),
    completed: sections.completed ?? sections["files in scope"] ?? [],
    remaining: sections["next steps"] ?? [],
    modifiedFiles: sections["files in scope"] ?? [],
    decisions: sections.decisions ?? [],
    constraints: sections.constraints ?? [],
    openIssues: sections.pitfalls ?? sections["known issues"] ?? [],
  };
}

export function generateHandoff(repoRoot: string, state?: SessionState): HandoffDocument {
  const activePath = arsenalPath(repoRoot, "memory/active-task.md");
  const content = readTextFile(activePath);
  const session = state ?? parseActiveTask(content);

  const recommendedNextPrompt =
    session.remaining.length > 0
      ? `Continue: ${session.goal}. Next: ${session.remaining[0]}`
      : session.goal
        ? `Continue work on: ${session.goal}`
        : "Review .arsenal/ context and pick up active task";

  const markdown = [
    "# Session Handoff",
    "",
    "## Goal",
    session.goal || "_No goal set_",
    "",
    "## Completed",
    ...(session.completed.length ? session.completed.map((c) => `- ${c}`) : ["- _none listed_"]),
    "",
    "## Remaining",
    ...(session.remaining.length ? session.remaining.map((r) => `- ${r}`) : ["- _none listed_"]),
    "",
    "## Open Issues",
    ...(session.openIssues.length ? session.openIssues.map((i) => `- ${i}`) : ["- _none_"]),
    "",
    "## Relevant Files",
    ...(session.modifiedFiles.length ? session.modifiedFiles.map((f) => `- \`${f}\``) : ["- _none listed_"]),
    "",
    "## Recommended Next Prompt",
    recommendedNextPrompt,
    "",
  ].join("\n");

  const outPath = arsenalPath(repoRoot, "prompts/agent-handoff.md");
  writeTextFile(outPath, markdown);

  return { markdown, recommendedNextPrompt };
}
