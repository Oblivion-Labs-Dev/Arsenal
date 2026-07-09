import { readFileSync, existsSync } from "fs";

export function summarizeDecisions(arsenalDir: string): string {
  const path = `${arsenalDir}/memory/decisions.md`;
  if (!existsSync(path)) return "No decisions recorded.";
  return readFileSync(path, "utf-8");
}

export function parseDecisions(content: string): string[] {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("-"))
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}
