import { generateHandoff } from "@arsenal/session-memory";

export function runHandoff(repoRoot: string) {
  return generateHandoff(repoRoot);
}
