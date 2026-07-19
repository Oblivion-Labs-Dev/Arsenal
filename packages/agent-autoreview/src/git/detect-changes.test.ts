import { describe, expect, it } from "vitest";
import { parseNameOnly, uniquePaths } from "./utils.js";
import { detectChangedFiles } from "./detect-changes.js";
import {
  startTaskSession,
  isolateSessionChanges,
  finishTaskSession,
  clearTaskSession,
} from "./session.js";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

function initRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "autoreview-git-"));
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: dir, stdio: "ignore" });
  writeFileSync(join(dir, "README.md"), "# test\n");
  execFileSync("git", ["add", "."], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "init"], { cwd: dir, stdio: "ignore" });
  return dir;
}

describe("git change detection", () => {
  it("parses name-only output", () => {
    expect(parseNameOnly("a.ts\nb.ts\n")).toEqual(["a.ts", "b.ts"]);
    expect(uniquePaths(["a\\b.ts", "a/b.ts"])).toEqual(["a/b.ts"]);
  });

  it("prioritizes explicit files", () => {
    const dir = initRepo();
    try {
      const result = detectChangedFiles({
        cwd: dir,
        explicitFiles: ["src/components/Card.tsx"],
      });
      expect(result.source).toBe("explicit-files");
      expect(result.files).toEqual(["src/components/Card.tsx"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects uncommitted files", () => {
    const dir = initRepo();
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src", "a.ts"), "export const a = 1;\n");
      const result = detectChangedFiles({ cwd: dir });
      expect(result.source).toBe("uncommitted");
      expect(result.files.some((f) => f.endsWith("src/a.ts") || f.endsWith("src\\a.ts"))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("handles repositories without git", () => {
    const dir = mkdtempSync(join(tmpdir(), "autoreview-nongit-"));
    try {
      const result = detectChangedFiles({ cwd: dir });
      expect(result.source).toBe("none");
      expect(result.files).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("isolates task session from pre-existing modifications", () => {
    const dir = initRepo();
    try {
      mkdirSync(join(dir, "src"), { recursive: true });
      writeFileSync(join(dir, "src", "old.ts"), "export const old = 1;\n");
      const session = startTaskSession(dir, "Build card hover");
      expect(session.existingModifiedFiles.some((f) => f.includes("old.ts"))).toBe(true);

      writeFileSync(join(dir, "src", "Card.tsx"), "export const Card = () => null;\n");
      const isolated = isolateSessionChanges(dir, session);
      expect(isolated.some((f) => f.includes("Card.tsx"))).toBe(true);
      expect(isolated.some((f) => f.includes("old.ts"))).toBe(false);

      finishTaskSession(dir);
      clearTaskSession(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
