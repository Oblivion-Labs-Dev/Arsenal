import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { installAutoreview, upgradeAutoreview, doctorAutoreview, inspectRepository } from "./index.js";

describe("repository exporter", () => {
  it("installs embedded mode without arsenal package dependency", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-emb-"));
    try {
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ name: "pages-site", private: true, scripts: { deploy: "gh-pages -d dist" } }, null, 2),
      );
      writeFileSync(join(dir, "index.html"), "<html></html>");
      const result = installAutoreview({ cwd: dir, mode: "embedded", preset: "github-pages" });
      expect(result.mode).toBe("embedded");
      expect(existsSync(join(dir, "tools/autoreview/cli.mjs"))).toBe(true);
      expect(existsSync(join(dir, ".agent-memory/index.json"))).toBe(true);
      expect(existsSync(join(dir, ".autoreview/installation.json"))).toBe(true);
      const pkg = readFileSync(join(dir, "package.json"), "utf8");
      expect(pkg).not.toMatch(/@arsenal\/agent-autoreview/);
      expect(pkg).toMatch(/review:run/);
      expect(pkg).toMatch(/tools\/autoreview/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("preserves existing AGENTS.md on upgrade", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-up-"));
    try {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "app", private: true }, null, 2));
      writeFileSync(join(dir, "AGENTS.md"), "# Custom agents\nDo not overwrite me.\n");
      installAutoreview({ cwd: dir, mode: "embedded" });
      upgradeAutoreview(dir);
      expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toContain("Do not overwrite me");
      const docs = doctorAutoreview(dir);
      expect(docs.ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects package managers", () => {
    const dir = mkdtempSync(join(tmpdir(), "export-pm-"));
    try {
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "pnpm-lock.yaml"), "");
      expect(inspectRepository(dir).packageManager).toBe("pnpm");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
