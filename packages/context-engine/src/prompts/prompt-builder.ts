import type { ContextPackage } from "../core/context-builder.js";
import { formatTokenCount } from "../core/token-estimator.js";

export function buildAgentHandoffMarkdown(pkg: ContextPackage): string {
  const lines = [
    "# Agent Handoff",
    "",
    `**Query:** ${pkg.query}`,
    `**Interpretation:** ${pkg.interpretation}`,
    "",
    `Context package estimate: **${formatTokenCount(pkg.estimatedTokens)} tokens**`,
    `Avoided loading: **${formatTokenCount(pkg.avoidedTokens)} estimated tokens**`,
    "",
    "## Relevant files",
    ...(pkg.relevantFiles.length ? pkg.relevantFiles.map((f) => `- \`${f}\``) : ["- none"]),
    "",
    "## Relevant symbols",
    ...(pkg.relevantSymbols.length ? pkg.relevantSymbols.map((s) => `- ${s}`) : ["- none"]),
    "",
    "## Summaries",
    ...pkg.summaries.map((s) => `### ${s.path}\n${s.purpose}\n`),
    "",
    "## Decisions",
    ...(pkg.decisions.length ? pkg.decisions.map((d) => `- ${d}`) : ["- none recorded"]),
    "",
    "## Pitfalls",
    ...(pkg.pitfalls.length ? pkg.pitfalls.map((p) => `- ${p}`) : ["- none recorded"]),
    "",
    "## Commands",
    ...(pkg.commands.length ? pkg.commands.map((c) => `- \`${c}\``) : ["- none"]),
    "",
    "## Tests likely affected",
    ...(pkg.testsAffected.length ? pkg.testsAffected.map((t) => `- \`${t}\``) : ["- none"]),
    "",
    "## Token budget",
    `- Used: ${formatTokenCount(pkg.estimatedTokens)} / ${formatTokenCount(pkg.maxTokens)}`,
  ];

  return lines.join("\n");
}

export function buildClaudeContextMarkdown(pkg: ContextPackage): string {
  return ["# Claude Context", "", buildAgentHandoffMarkdown(pkg)].join("\n");
}

export function buildCursorContextMarkdown(pkg: ContextPackage): string {
  return ["# Cursor Context", "", buildAgentHandoffMarkdown(pkg)].join("\n");
}
