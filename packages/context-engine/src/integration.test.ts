import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdtempSync, cpSync, rmSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { runInit } from "./cli/commands/init.js";
import { runIndex } from "./cli/commands/index-cmd.js";
import { runSummarize } from "./cli/commands/summarize.js";
import { runGraph } from "./cli/commands/graph.js";
import { runBuild } from "./cli/commands/context.js";
import { runDoctor } from "./cli/commands/doctor.js";

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "fake-repo");

describe("integration: fake repo workflow", () => {
  let workDir: string;

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), "arsenal-integration-"));
    cpSync(fixtureRoot, workDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it("runs full context pipeline", () => {
    const cwd = process.cwd();
    process.chdir(workDir);

    try {
      runInit(workDir);
      expect(existsSync(join(workDir, ".arsenal", "config.json"))).toBe(true);

      runIndex(workDir);
      expect(existsSync(join(workDir, ".arsenal", "repo-map.json"))).toBe(true);
      expect(existsSync(join(workDir, ".arsenal", "dependency-graph.json"))).toBe(true);

      runGraph(workDir);
      expect(existsSync(join(workDir, ".arsenal", "knowledge-graph.json"))).toBe(true);

      runSummarize(workDir);
      expect(existsSync(join(workDir, ".arsenal", "summaries", "architecture.md"))).toBe(true);

      const build = runBuild(workDir, "fix OAuth token refresh");
      expect(build.estimatedTokens).toBeGreaterThan(0);
      const handoff = readFileSync(build.path, "utf-8");
      expect(handoff).toContain("OAuth");

      const doctor = runDoctor(workDir);
      expect(doctor.ok).toBe(true);
    } finally {
      process.chdir(cwd);
    }
  });
});
