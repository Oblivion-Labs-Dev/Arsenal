import { initRepoRules } from "../../core/init-workspace.js";

export function runInit(repoRoot: string) {
  const result = initRepoRules(repoRoot);
  return result;
}
