import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { VisualBaseline } from "./types.js";
import { ensureMemoryLayout, listBaselines, memoryRoot, saveBaselines } from "./store.js";

export function approveBaseline(options: {
  cwd: string;
  screenshotPath: string;
  route: string;
  viewport: string;
  state?: string;
  selector?: string;
  approvedBy?: string;
}): VisualBaseline {
  const { cwd, screenshotPath, route, viewport } = options;
  if (!existsSync(screenshotPath)) {
    throw new Error(`Screenshot not found: ${screenshotPath}`);
  }
  ensureMemoryLayout(cwd);
  const state = options.state ?? "default";
  const buf = readFileSync(screenshotPath);
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 16);
  const id = createHash("sha256")
    .update(`${route}:${viewport}:${state}:${options.selector ?? ""}`)
    .digest("hex")
    .slice(0, 12);
  const destDir = join(memoryRoot(cwd), "visual-baselines", id);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, basename(screenshotPath) || "baseline.png");
  copyFileSync(screenshotPath, dest);

  const baseline: VisualBaseline = {
    id,
    route,
    viewport,
    state,
    selector: options.selector,
    path: dest,
    approvedAt: new Date().toISOString(),
    approvedBy: options.approvedBy ?? "maintainer",
    hash,
  };

  const all = listBaselines(cwd).filter(
    (b) => !(b.route === route && b.viewport === viewport && b.state === state),
  );
  all.push(baseline);
  saveBaselines(cwd, all);
  return baseline;
}

export function removeBaseline(cwd: string, id: string): boolean {
  const all = listBaselines(cwd);
  const next = all.filter((b) => b.id !== id);
  if (next.length === all.length) return false;
  saveBaselines(cwd, next);
  return true;
}

export function diffBaseline(
  cwd: string,
  id: string,
  candidatePath: string,
): { matched: boolean; baseline?: VisualBaseline; candidateHash: string; baselineHash?: string } {
  const baseline = listBaselines(cwd).find((b) => b.id === id);
  if (!existsSync(candidatePath)) {
    throw new Error(`Candidate screenshot not found: ${candidatePath}`);
  }
  const candidateHash = createHash("sha256")
    .update(readFileSync(candidatePath))
    .digest("hex")
    .slice(0, 16);
  if (!baseline) return { matched: false, candidateHash };
  return {
    matched: baseline.hash === candidateHash,
    baseline,
    candidateHash,
    baselineHash: baseline.hash,
  };
}

export function writeBaselineManifestNote(cwd: string, note: string): void {
  ensureMemoryLayout(cwd);
  writeFileSync(
    join(memoryRoot(cwd), "visual-baselines", "NOTES.md"),
    `${note}\n`,
    "utf8",
  );
}
