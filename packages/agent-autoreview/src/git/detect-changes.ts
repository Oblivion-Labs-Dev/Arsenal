import type { ChangeSource } from "../types.js";
import {
  isGitRepository,
  parseNameOnly,
  parsePorcelainPaths,
  tryGit,
  uniquePaths,
} from "./utils.js";
import { loadTaskSession, isolateSessionChanges } from "./session.js";

export interface DetectedChanges {
  files: string[];
  source: ChangeSource;
  reasoning: string;
}

export interface DetectChangesOptions {
  cwd: string;
  baseBranch?: string;
  explicitFiles?: string[];
}

/**
 * Detect changed files using priority:
 * 1. Explicit --files
 * 2. Task-session delta
 * 3. Uncommitted staged + unstaged + untracked
 * 4. Branch diff against base
 * 5. Current commit as fallback
 */
export function detectChangedFiles(options: DetectChangesOptions): DetectedChanges {
  const { cwd, baseBranch = "main", explicitFiles } = options;

  if (explicitFiles && explicitFiles.length > 0) {
    return {
      files: uniquePaths(explicitFiles),
      source: "explicit-files",
      reasoning: "Explicit files supplied via --files",
    };
  }

  if (!isGitRepository(cwd)) {
    return {
      files: [],
      source: "none",
      reasoning: "Not a Git repository; no automatic change detection available",
    };
  }

  const session = loadTaskSession(cwd);
  if (session && !session.finishedAt) {
    const sessionFiles = isolateSessionChanges(cwd, session);
    if (sessionFiles.length > 0) {
      return {
        files: sessionFiles,
        source: "task-session",
        reasoning: `Isolated files modified after task session "${session.taskDescription}" began`,
      };
    }
  }

  const unstaged = parseNameOnly(tryGit(cwd, ["diff", "--name-only"]) ?? "");
  const staged = parseNameOnly(tryGit(cwd, ["diff", "--cached", "--name-only"]) ?? "");
  const porcelain = parsePorcelainPaths(
    tryGit(cwd, ["status", "--porcelain", "-uall"]) ?? "",
  );
  const uncommitted = uniquePaths([...unstaged, ...staged, ...porcelain]);
  if (uncommitted.length > 0) {
    return {
      files: uncommitted,
      source: "uncommitted",
      reasoning: "Uncommitted staged, unstaged, and untracked working tree changes",
    };
  }

  const branchDiff =
    tryGit(cwd, ["diff", "--name-only", `${baseBranch}...HEAD`]) ??
    tryGit(cwd, ["diff", "--name-only", `origin/${baseBranch}...HEAD`]);
  if (branchDiff) {
    const files = uniquePaths(parseNameOnly(branchDiff));
    if (files.length > 0) {
      return {
        files,
        source: "branch-diff",
        reasoning: `Current branch diff against ${baseBranch}`,
      };
    }
  }

  const commitDiff = tryGit(cwd, ["show", "--name-only", "--format=", "HEAD"]);
  if (commitDiff) {
    const files = uniquePaths(parseNameOnly(commitDiff));
    if (files.length > 0) {
      return {
        files,
        source: "commit-diff",
        reasoning: "Fallback to files changed in HEAD commit",
      };
    }
  }

  return {
    files: [],
    source: "none",
    reasoning: "No changed files detected",
  };
}
