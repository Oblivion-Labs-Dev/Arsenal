import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function isGitRepository(cwd: string): boolean {
  return existsSync(join(cwd, ".git"));
}

export function runGit(cwd: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }).trim();
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(err.stderr?.trim() || err.message || `git ${args.join(" ")} failed`);
  }
}

export function tryGit(cwd: string, args: string[]): string | null {
  try {
    return runGit(cwd, args);
  } catch {
    return null;
  }
}

export function parseNameOnly(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("commit ") && !line.includes("\t"));
}

/** Parse `git status --porcelain` paths (tracked + untracked). */
export function parsePorcelainPaths(output: string): string[] {
  const files: string[] = [];
  for (const raw of output.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    // XY␠path or XY␠old -> new
    const pathPart = raw.slice(3);
    if (pathPart.includes(" -> ")) {
      const renamed = pathPart.split(" -> ").pop();
      if (renamed) files.push(renamed.trim());
    } else {
      files.push(pathPart.trim().replace(/^"|"$/g, ""));
    }
  }
  return uniquePaths(files);
}

export function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((p) => p.replace(/\\/g, "/")))];
}
