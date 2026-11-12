import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AutoreviewReport } from "../types.js";
import { redactSecrets, writeReports } from "./report.js";

// Assembled at runtime so secret scanners do not flag the fixture.
const GITHUB = ["ghp_", "aB3dE5gH7jK9mN1pQ3sT5vW7yZ9"].join("");

function report(overrides: Partial<AutoreviewReport>): AutoreviewReport {
  return {
    taskDescription: "Update Card",
    mode: "fast",
    changedFiles: ["src/components/Card.tsx"],
    affectedComponents: [],
    affectedRoutes: [],
    scopeReasoning: {},
    checksExecuted: [],
    checksSkipped: [],
    screenshotsCaptured: [],
    interactionsTested: [],
    issuesFound: [],
    fixesApplied: [],
    remainingIssues: [],
    scopeExclusions: [],
    expandedItems: [],
    budgetUsage: {
      changedSourceFiles: 1,
      affectedRoutes: 0,
      browserPages: 0,
      screenshots: 0,
      modelCriticCalls: 0,
      repairIterations: 0,
      dependencyDepth: 1,
      testDurationSeconds: 0,
    },
    modelCallsUsed: 0,
    estimatedTokensConsumed: 1234567,
    cacheHits: 0,
    qualityGatesPassed: true,
    qualityGateResults: {},
    disclaimer: "Scoped.",
    generatedAt: "2026-11-12T08:30:00.000Z",
    ...overrides,
  };
}

describe("report redaction", () => {
  // Regression: the old two-regex redactor only caught `key=value` and `Bearer x`, so a bare
  // token pasted into a task or fix note reached latest.json and latest.md verbatim.
  it("removes a bare GitHub token the old redactor let through", () => {
    expect(redactSecrets(`token was ${GITHUB}`)).not.toContain(GITHUB);
  });

  it("writes reports without secrets but keeps counts, ids and timestamps", () => {
    const dir = mkdtempSync(join(tmpdir(), "report-redact-"));
    try {
      const paths = writeReports(
        dir,
        "reports",
        report({
          taskDescription: `use ${GITHUB} for CI`,
          fixesApplied: ["set password=hunter22 in fixture"],
        }),
      );
      const json = readFileSync(paths.jsonPath, "utf8");
      const md = readFileSync(paths.markdownPath, "utf8");
      for (const text of [json, md]) {
        expect(text).not.toContain(GITHUB);
        expect(text).not.toContain("hunter22");
        expect(text).toContain("2026-11-12T08:30:00.000Z");
      }
      const parsed = JSON.parse(json) as AutoreviewReport;
      expect(parsed.estimatedTokensConsumed).toBe(1234567);
      expect(parsed.changedFiles).toEqual(["src/components/Card.tsx"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
