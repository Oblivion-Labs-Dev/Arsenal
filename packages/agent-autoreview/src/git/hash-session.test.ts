/**
 * Hash-based re-dirty detection for task sessions.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  startTaskSession,
  isolateSessionChanges,
  clearTaskSession,
} from "./session.js";

function initRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "hash-sess-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "t@t.com"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "t"], { cwd: dir, stdio: "ignore" });
  writeFileSync(join(dir, "README.md"), "x\n");
  execFileSync("git", ["add", "."], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "i"], { cwd: dir, stdio: "ignore" });
  return dir;
}

describe("hash-based task change detection", () => {
  it("includes pre-existing dirty files only after content hash changes", () => {
    const dir = initRepo();
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src/old.ts"), "export const a = 1;\n");
      const session = startTaskSession(dir, "task");
      expect(session.existingFileHashes?.["src/old.ts"]).toBeTruthy();

      // Unchanged pre-existing dirty file stays excluded
      let changes = isolateSessionChanges(dir, session);
      expect(changes.some((f) => f.includes("old.ts"))).toBe(false);

      // Mutate the dirty file during the task
      writeFileSync(join(dir, "src/old.ts"), "export const a = 2;\n");
      changes = isolateSessionChanges(dir, session);
      expect(changes.some((f) => f.includes("old.ts"))).toBe(true);

      clearTaskSession(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
