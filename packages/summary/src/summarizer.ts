import { estimateTokens } from "@arsenal/core";

export type SummaryLevel = "micro" | "short" | "detailed" | "technical" | "architecture";

const LEVEL_TARGETS: Record<SummaryLevel, number> = {
  micro: 50,
  short: 200,
  detailed: 600,
  technical: 400,
  architecture: 800,
};

export function summarizeText(text: string, level: SummaryLevel = "short"): string {
  const targetWords = LEVEL_TARGETS[level];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());

  if (level === "micro") {
    const first = sentences[0]?.trim() ?? lines[0]?.trim() ?? text.slice(0, 200);
    return truncateWords(first, 50);
  }

  if (level === "short") {
    return truncateWords(lines.slice(0, 8).join(". "), targetWords);
  }

  if (level === "technical") {
    const codeHints = lines.filter((l) => /export|function|class|import|const/.test(l)).slice(0, 10);
    return truncateWords([...lines.slice(0, 3), ...codeHints].join("\n"), targetWords);
  }

  if (level === "architecture") {
    return truncateWords(lines.filter((l) => !l.startsWith("//")).slice(0, 20).join("\n"), targetWords);
  }

  return truncateWords(text, targetWords);
}

export function compressTerminalOutput(output: string, maxTokens = 500): string {
  const lines = output.split(/\r?\n/);
  const errors = lines.filter((l) => /error|fail|panic|exception/i.test(l));
  const warnings = lines.filter((l) => /warn/i.test(l));
  const summary = [
    `Lines: ${lines.length}`,
    `Errors: ${errors.length}`,
    `Warnings: ${warnings.length}`,
    "",
    "## Errors",
    ...errors.slice(0, 15),
    "",
    "## Warnings",
    ...warnings.slice(0, 10),
  ].join("\n");

  const tokens = estimateTokens(summary);
  if (tokens <= maxTokens) return summary;
  return truncateWords(summary, maxTokens * 4);
}

export function deduplicateBlocks(blocks: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const block of blocks) {
    const key = block.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(block);
  }
  return result;
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}
