import { readActiveTaskMarkdown, parseActiveTaskSections } from "../../summaries/task-summarizer.js";
import { arsenalPath } from "../../core/paths.js";
import { appendTextFile, writeTextFile } from "../../core/file-io.js";
import { COMPACT_HISTORY_HEADER } from "../../prompts/prompt-templates.js";
import { logAgentEvent } from "../../analytics/usage-logger.js";

export function runCompact(repoRoot: string) {
  const activeTaskPath = arsenalPath(repoRoot, "memory/active-task.md");
  const content = readActiveTaskMarkdown(arsenalPath(repoRoot));
  const sections = parseActiveTaskSections(content);

  const compact = [
    "# Compact Handoff",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Current task",
    sections.goal?.join("\n") || sections.general?.join("\n") || "_No task set_",
    "",
    "## Files changed",
    ...(sections["files in scope"]?.length
      ? sections["files in scope"].map((f) => `- ${f}`)
      : ["- _none listed_"]),
    "",
    "## Decisions made",
    ...(sections.decisions?.length ? sections.decisions.map((d) => `- ${d}`) : ["- _none listed_"]),
    "",
    "## Known issues",
    ...(sections.pitfalls?.length
      ? sections.pitfalls.map((p) => `- ${p}`)
      : ["- _none listed_"]),
    "",
    "## Tests run",
    ...(sections["tests run"]?.length
      ? sections["tests run"].map((t) => `- ${t}`)
      : ["- _none listed_"]),
    "",
    "## Next steps",
    ...(sections["next steps"]?.length
      ? sections["next steps"].map((s) => `- ${s}`)
      : ["- _none listed_"]),
    "",
  ].join("\n");

  const historyPath = arsenalPath(repoRoot, "memory/compact-history.md");
  appendTextFile(historyPath, `${COMPACT_HISTORY_HEADER}${compact}`);

  const handoffPath = arsenalPath(repoRoot, "prompts/agent-handoff.md");
  writeTextFile(handoffPath, compact);

  logAgentEvent(repoRoot, "COMPACT_CREATED", {
    metadata: { sections: Object.keys(sections) },
  });

  return { activeTaskPath, historyPath, handoffPath };
}
