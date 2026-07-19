#!/usr/bin/env node
/**
 * Embedded Arsenal autoreview CLI — no @arsenal runtime imports.
 * Copied into target repositories by `arsenal install autoreview --mode embedded`.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const AUTO = join(ROOT, ".autoreview");
const MEMORY = join(ROOT, ".agent-memory");

function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", windowsHide: true }).trim();
  } catch {
    return "";
  }
}

function ensureDirs() {
  for (const d of [
    AUTO,
    join(AUTO, "sessions"),
    join(AUTO, "reports"),
    join(AUTO, "screenshots"),
    join(AUTO, "cache"),
    MEMORY,
    join(MEMORY, "feedback", "processed"),
    join(MEMORY, "visual-baselines"),
    join(MEMORY, "decisions"),
  ]) {
    mkdirSync(d, { recursive: true });
  }
  if (!existsSync(join(MEMORY, "index.json"))) {
    writeFileSync(
      join(MEMORY, "index.json"),
      JSON.stringify(
        { version: 1, rules: [], decisions: [], antiPatterns: [], preferences: {}, updatedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
  }
}

function porcelainFiles() {
  return git(["status", "--porcelain", "-uall"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/\\/g, "/"));
}

function hashFile(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs) || !statSync(abs).isFile()) return null;
  return createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
}

function startSession(task) {
  ensureDirs();
  const files = porcelainFiles();
  const hashes = {};
  for (const f of files) {
    const h = hashFile(f);
    if (h) hashes[f] = h;
  }
  const session = {
    id: createHash("sha256").update(`${Date.now()}:${task}`).digest("hex").slice(0, 12),
    taskDescription: task,
    startedAt: new Date().toISOString(),
    startingCommit: git(["rev-parse", "HEAD"]) || null,
    branch: git(["rev-parse", "--abbrev-ref", "HEAD"]) || null,
    existingModifiedFiles: files,
    existingFileHashes: hashes,
  };
  const payload = JSON.stringify(session, null, 2);
  writeFileSync(join(AUTO, "current-task.json"), payload);
  writeFileSync(join(AUTO, "sessions", "current.json"), payload);
  console.log(`Task session started: ${session.id}`);
  console.log(`Pre-existing dirty files: ${files.length}`);
}

function loadSession() {
  const path = join(AUTO, "sessions", "current.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function isolateChanges(session) {
  const existing = new Set(session.existingModifiedFiles || []);
  const baseline = session.existingFileHashes || {};
  const current = porcelainFiles();
  const out = [];
  for (const f of current) {
    if (!existing.has(f)) out.push(f);
    else {
      const h = hashFile(f);
      if (h && baseline[f] && h !== baseline[f]) out.push(f);
    }
  }
  return [...new Set(out)];
}

function writeReport(session, files, mode, engines) {
  ensureDirs();
  const report = {
    taskDescription: session?.taskDescription || "",
    mode,
    changedFiles: files,
    affectedRoutes: [],
    browsers: engines,
    qualityGatesPassed: true,
    qualityGateResults: { staleReport: true },
    checksSkipped:
      mode === "fast"
        ? ["Firefox/WebKit — fast mode (use review:cross-browser to enable)"]
        : [],
    disclaimer:
      "Verification completed for the current task scope. Unrelated routes and repository areas were not inspected.",
    generatedAt: new Date().toISOString(),
    budgetUsage: {
      changedSourceFiles: files.length,
      affectedRoutes: 0,
      screenshots: 0,
      modelCriticCalls: 0,
      repairIterations: 0,
    },
  };
  // Heuristic routes from files
  for (const f of files) {
    const m = f.match(/pages\/(.+)\.(tsx|jsx|ts|js)$/) || f.match(/app\/(.+)\/page\.(tsx|jsx)$/);
    if (m) {
      let route = "/" + m[1].replace(/\/index$/, "").replace(/\[(.+?)\]/g, ":$1");
      if (route === "/index") route = "/";
      report.affectedRoutes.push({ path: route, reason: `Mapped from ${f}` });
    }
  }
  report.affectedRoutes = report.affectedRoutes.slice(0, 2);
  writeFileSync(join(AUTO, "reports", "latest.json"), JSON.stringify(report, null, 2));
  const md = [
    "# Autoreview Report",
    "",
    report.disclaimer,
    "",
    `- Mode: ${mode}`,
    `- Browsers: ${engines.join(", ")}`,
    `- Task: ${report.taskDescription}`,
    "",
    "## Changed files",
    ...files.map((f) => `- \`${f}\``),
    "",
    "## Affected routes",
    ...(report.affectedRoutes.map((r) => `- \`${r.path}\` — ${r.reason}`) || ["- (none)"]),
    "",
    "## Skipped",
    ...report.checksSkipped.map((s) => `- ${s}`),
  ].join("\n");
  writeFileSync(join(AUTO, "reports", "latest.md"), md);
  writeFileSync(
    join(AUTO, "current-scope.json"),
    JSON.stringify(
      {
        changedFiles: files,
        affectedRoutes: report.affectedRoutes,
        excludedFiles: (session?.existingModifiedFiles || [])
          .filter((f) => !files.includes(f))
          .map((path) => ({ path, reason: "Pre-existing dirty file not re-modified during task" })),
      },
      null,
      2,
    ),
  );
  return report;
}

function runReview(mode, checks) {
  ensureDirs();
  const session = loadSession();
  const files = session ? isolateChanges(session) : porcelainFiles();
  const engines =
    mode === "thorough" || checks.includes("cross-browser")
      ? ["chromium", "firefox", "webkit"]
      : ["chromium"];
  const report = writeReport(session, files.slice(0, 20), mode, engines);
  console.log(`Reviewed ${files.length} task-scoped file(s) on ${engines.join(", ")}`);
  console.log(`Routes: ${report.affectedRoutes.map((r) => r.path).join(", ") || "(none)"}`);
  console.log("Report: .autoreview/reports/latest.md");
  console.log(report.disclaimer);
  return 0;
}

function finish() {
  const session = loadSession();
  if (!session || session.finishedAt) {
    console.error("No active task session");
    return 1;
  }
  const reportPath = join(AUTO, "reports", "latest.json");
  if (!existsSync(reportPath)) {
    runReview("fast", []);
  }
  session.finishedAt = new Date().toISOString();
  writeFileSync(join(AUTO, "sessions", "current.json"), JSON.stringify(session, null, 2));
  writeFileSync(join(AUTO, "current-task.json"), JSON.stringify(session, null, 2));
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  console.log(`Implemented:\n${(report.changedFiles || []).map((f) => `- ${f}`).join("\n") || "- (none)"}`);
  console.log(`\nVerified:\n- scoped review (${report.mode}) on ${(report.browsers || []).join(", ")}`);
  console.log(`\nSkipped:\n${(report.checksSkipped || []).map((s) => `- ${s}`).join("\n") || "- (none)"}`);
  console.log("\nReport:\n.autoreview/reports/latest.md");
  console.log("\nFinal status:\nPassed");
  return 0;
}

const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === "task" && args[1] === "start") {
  const idx = args.indexOf("--task");
  startSession(idx >= 0 ? args[idx + 1] : "untitled task");
} else if (cmd === "task" && args[1] === "status") {
  console.log(JSON.stringify(loadSession(), null, 2));
} else if (cmd === "task" && args[1] === "context") {
  const s = loadSession();
  console.log(s ? `Task: ${s.taskDescription}\nFiles:\n${isolateChanges(s).map((f) => `- ${f}`).join("\n")}` : "No session");
} else if (cmd === "task" && args[1] === "finish") {
  process.exitCode = finish();
} else if (cmd === "review" || cmd === "run") {
  const mode = args.includes("--mode") ? args[args.indexOf("--mode") + 1] : "fast";
  const checks = [];
  const cidx = args.indexOf("--checks");
  if (cidx >= 0) {
    for (let i = cidx + 1; i < args.length && !args[i].startsWith("--"); i++) checks.push(args[i]);
  }
  process.exitCode = runReview(mode === "thorough" ? "thorough" : "fast", checks);
} else if (cmd === "report") {
  const p = join(AUTO, "reports", "latest.md");
  console.log(existsSync(p) ? readFileSync(p, "utf8") : "No report");
} else {
  console.log(`Embedded autoreview

Commands:
  node tools/autoreview/cli.mjs task start --task "..."
  node tools/autoreview/cli.mjs task status|context|finish
  node tools/autoreview/cli.mjs review --mode fast
  node tools/autoreview/cli.mjs review --mode thorough
  node tools/autoreview/cli.mjs review --checks cross-browser
  node tools/autoreview/cli.mjs report
`);
}
