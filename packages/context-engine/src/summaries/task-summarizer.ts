import { readFileSync, existsSync } from "fs";

export function readActiveTaskMarkdown(arsenalPath: string): string {
  const file = `${arsenalPath}/memory/active-task.md`;
  if (!existsSync(file)) return "";
  return readFileSync(file, "utf-8");
}

export function summarizeActiveTask(content: string): string {
  if (!content.trim()) return "No active task set.";
  return content;
}

export function parseActiveTaskSections(content: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current = "general";
  sections[current] = [];

  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith("#")) {
      current = line.replace(/^#+\s*/, "").toLowerCase();
      sections[current] = [];
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!sections[current]) sections[current] = [];
    if (trimmed.startsWith("-")) {
      sections[current].push(trimmed.replace(/^\s*-\s*/, "").trim());
    } else {
      sections[current].push(trimmed);
    }
  }
  return sections;
}
