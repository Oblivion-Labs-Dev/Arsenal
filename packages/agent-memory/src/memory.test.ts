import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  applyFeedback,
  approveBaseline,
  diffBaseline,
  ensureMemoryLayout,
  extractFeedback,
  promoteAcrossComponents,
  retrieveMemory,
} from "./index.js";

describe("feedback extraction and promotion", () => {
  it("extracts overlap correction without globalizing", () => {
    const extracted = extractFeedback({
      text: "This card overlaps the edge on mobile",
      component: "card",
    });
    expect(extracted.classification).toBe("correction");
    expect(extracted.objectiveIssues.length).toBeGreaterThan(0);
    expect(extracted.repositoryRules.length).toBe(0);
    expect(extracted.componentRules.length).toBeGreaterThan(0);
  });

  it("promotes only after repeated soft component corrections", () => {
    const dir = mkdtempSync(join(tmpdir(), "mem-"));
    try {
      ensureMemoryLayout(dir);
      const first = extractFeedback({
        text: "Prefer slightly tighter spacing on the card",
        component: "card",
      });
      applyFeedback(dir, first, "f1");
      let mem = retrieveMemory(dir, { components: ["card"], maxRules: 10 });
      expect(mem.rules[0]?.level).toBe("observation");

      applyFeedback(dir, first, "f2");
      mem = retrieveMemory(dir, { components: ["card"], maxRules: 10 });
      expect(mem.rules.some((r) => r.level === "component")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("promotes repository rule across three components", () => {
    const dir = mkdtempSync(join(tmpdir(), "mem2-"));
    try {
      ensureMemoryLayout(dir);
      for (const component of ["card", "modal", "nav"]) {
        const extracted = extractFeedback({
          text: "Avoid generic template appearance",
          component,
        });
        applyFeedback(dir, extracted, `f-${component}`);
      }
      promoteAcrossComponents(dir);
      const mem = retrieveMemory(dir, { taskText: "generic", maxRules: 10 });
      expect(mem.rules.some((r) => r.level === "repository")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("bounds retrieval tokens and rule count", () => {
    const dir = mkdtempSync(join(tmpdir(), "mem3-"));
    try {
      ensureMemoryLayout(dir);
      for (let i = 0; i < 20; i++) {
        const extracted = extractFeedback({
          text: `Component preference number ${i} for spacing rhythm`,
          component: "card",
        });
        applyFeedback(dir, extracted, `x${i}`);
      }
      const mem = retrieveMemory(dir, {
        components: ["card"],
        maxRules: 10,
        maxTokens: 4000,
      });
      expect(mem.rules.length).toBeLessThanOrEqual(10);
      expect(mem.estimatedTokens).toBeLessThanOrEqual(4000);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("baselines", () => {
  it("approves and diffs baselines without auto-approval", () => {
    const dir = mkdtempSync(join(tmpdir(), "base-"));
    try {
      const shot = join(dir, "shot.png");
      writeFileSync(shot, Buffer.from([1, 2, 3, 4]));
      const baseline = approveBaseline({
        cwd: dir,
        screenshotPath: shot,
        route: "/components",
        viewport: "desktop",
        approvedBy: "test",
      });
      expect(baseline.hash).toBeTruthy();
      const same = join(dir, "same.png");
      writeFileSync(same, Buffer.from([1, 2, 3, 4]));
      expect(diffBaseline(dir, baseline.id, same).matched).toBe(true);
      const other = join(dir, "other.png");
      writeFileSync(other, Buffer.from([9, 9, 9]));
      expect(diffBaseline(dir, baseline.id, other).matched).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
