import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import type { TaskSession } from "../types.js";
import {
  isGitRepository,
  parseNameOnly,
  parsePorcelainPaths,
  tryGit,
  uniquePaths,
} from "./utils.js";

const SESSION_DIR = ".autoreview";
const SESSION_FILE = "task-session.json";
const CURRENT_TASK_FILE = "current-task.json";
const SESSIONS_DIR = "sessions";

function sessionPath(cwd: string): string {
  return join(cwd, SESSION_DIR, SESSION_FILE);
}

function currentTaskPath(cwd: string): string {
  return join(cwd, SESSION_DIR, CURRENT_TASK_FILE);
}

function sessionsCurrentPath(cwd: string): string {
  return join(cwd, SESSION_DIR, SESSIONS_DIR, "current.json");
}

function hashFileContent(cwd: string, relativePath: string): string | null {
  const abs = join(cwd, relativePath);
  if (!existsSync(abs) || !statSync(abs).isFile()) return null;
  try {
    return createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
  } catch {
    return null;
  }
}

function workingTreeSnapshot(cwd: string): {
  hash: string;
  files: string[];
  staged: string[];
  unstaged: string[];
  untracked: string[];
  fileHashes: Record<string, string>;
  branch: string | null;
} {
  if (!isGitRepository(cwd)) {
    return {
      hash: "no-git",
      files: [],
      staged: [],
      unstaged: [],
      untracked: [],
      fileHashes: {},
      branch: null,
    };
  }
  const status = tryGit(cwd, ["status", "--porcelain", "-uall"]) ?? "";
  const files = parsePorcelainPaths(status);
  const staged = parseNameOnly(tryGit(cwd, ["diff", "--cached", "--name-only"]) ?? "");
  const unstaged = parseNameOnly(tryGit(cwd, ["diff", "--name-only"]) ?? "");
  const untracked = files.filter((f) => !staged.includes(f) && !unstaged.includes(f));
  const fileHashes: Record<string, string> = {};
  for (const file of files) {
    const h = hashFileContent(cwd, file);
    if (h) fileHashes[file] = h;
  }
  const hash = createHash("sha256").update(status).digest("hex").slice(0, 16);
  const branch = tryGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  return { hash, files, staged, unstaged, untracked, fileHashes, branch };
}

export function startTaskSession(cwd: string, taskDescription: string): TaskSession {
  mkdirSync(join(cwd, SESSION_DIR, SESSIONS_DIR), { recursive: true });
  const snapshot = workingTreeSnapshot(cwd);
  const reportPath = join(cwd, SESSION_DIR, "reports", "latest.json");
  const session: TaskSession = {
    id: createHash("sha256").update(`${Date.now()}:${taskDescription}`).digest("hex").slice(0, 12),
    taskDescription,
    startedAt: new Date().toISOString(),
    startingCommit: isGitRepository(cwd) ? tryGit(cwd, ["rev-parse", "HEAD"]) : null,
    branch: snapshot.branch,
    initialWorkingTreeHash: snapshot.hash,
    existingModifiedFiles: snapshot.files,
    existingFileHashes: snapshot.fileHashes,
    stagedAtStart: snapshot.staged,
    unstagedAtStart: snapshot.unstaged,
    untrackedAtStart: snapshot.untracked,
    reportStateAtStart: existsSync(reportPath)
      ? createHash("sha256").update(readFileSync(reportPath)).digest("hex").slice(0, 12)
      : null,
  };
  const payload = JSON.stringify(session, null, 2);
  writeFileSync(sessionPath(cwd), payload, "utf8");
  writeFileSync(currentTaskPath(cwd), payload, "utf8");
  writeFileSync(sessionsCurrentPath(cwd), payload, "utf8");
  return session;
}

export function loadTaskSession(cwd: string): TaskSession | null {
  for (const path of [sessionsCurrentPath(cwd), currentTaskPath(cwd), sessionPath(cwd)]) {
    if (!existsSync(path)) continue;
    try {
      return JSON.parse(readFileSync(path, "utf8")) as TaskSession;
    } catch {
      continue;
    }
  }
  return null;
}

export function finishTaskSession(cwd: string): TaskSession | null {
  const session = loadTaskSession(cwd);
  if (!session) return null;
  const finished: TaskSession = {
    ...session,
    finishedAt: new Date().toISOString(),
  };
  const payload = JSON.stringify(finished, null, 2);
  writeFileSync(sessionPath(cwd), payload, "utf8");
  writeFileSync(currentTaskPath(cwd), payload, "utf8");
  writeFileSync(sessionsCurrentPath(cwd), payload, "utf8");
  return finished;
}

export function clearTaskSession(cwd: string): void {
  for (const path of [sessionPath(cwd), currentTaskPath(cwd), sessionsCurrentPath(cwd)]) {
    if (existsSync(path)) unlinkSync(path);
  }
}

/**
 * Isolate files modified after the task session began.
 * Pre-existing dirty files are excluded unless their content hash changed.
 */
export function isolateSessionChanges(cwd: string, session: TaskSession): string[] {
  if (!isGitRepository(cwd)) return [];

  const existing = new Set(session.existingModifiedFiles);
  const baselineHashes = session.existingFileHashes ?? {};
  const currentUncommitted = uniquePaths([
    ...parseNameOnly(tryGit(cwd, ["diff", "--name-only"]) ?? ""),
    ...parseNameOnly(tryGit(cwd, ["diff", "--cached", "--name-only"]) ?? ""),
    ...parsePorcelainPaths(tryGit(cwd, ["status", "--porcelain", "-uall"]) ?? ""),
  ]);

  const newlyModified = currentUncommitted.filter((file) => !existing.has(file));

  const dirtyAgain: string[] = [];
  for (const file of currentUncommitted) {
    if (!existing.has(file)) continue;
    const currentHash = hashFileContent(cwd, file);
    const baseline = baselineHashes[file];
    if (currentHash && baseline && currentHash !== baseline) {
      dirtyAgain.push(file);
    }
  }

  const commitsSince =
    session.startingCommit &&
    tryGit(cwd, ["diff", "--name-only", `${session.startingCommit}...HEAD`]);
  const committedDuring = commitsSince ? uniquePaths(parseNameOnly(commitsSince)) : [];

  return uniquePaths([...newlyModified, ...dirtyAgain, ...committedDuring]);
}

export function sessionStatus(cwd: string): {
  active: boolean;
  session: TaskSession | null;
} {
  const session = loadTaskSession(cwd);
  return {
    active: Boolean(session && !session.finishedAt),
    session,
  };
}

export function taskContextSummary(cwd: string): string {
  const status = sessionStatus(cwd);
  if (!status.session) return "No active task session.";
  const s = status.session;
  const changes = isolateSessionChanges(cwd, s);
  return [
    `# Task context`,
    `Task: ${s.taskDescription}`,
    `Session: ${s.id}`,
    `Branch: ${s.branch ?? "(unknown)"}`,
    `Started: ${s.startedAt}`,
    `Starting commit: ${s.startingCommit ?? "(none)"}`,
    `Pre-existing dirty files: ${s.existingModifiedFiles.length}`,
    `Task-scoped changes (${changes.length}):`,
    ...changes.map((f) => `- ${f}`),
    "",
    "Workflow: implement → arsenal review --mode fast → fix gates → arsenal agent finish",
  ].join("\n");
}
