import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { AutoreviewConfig } from "../config/defaults.js";
import type { Finding, ScopeManifest } from "../types.js";

const ANIMATION_CSS_RE =
  /transition|animation|@keyframes|transform|opacity|translate|scale|rotate/i;
const ANIMATION_LIB_RE = /framer-motion|gsap|anime\.js|@react-spring|motion\./i;

export function hasAnimationChanges(manifest: ScopeManifest, cwd: string): boolean {
  return manifest.changedFiles.some((file) => {
    const abs = join(cwd, file);
    if (!existsSync(abs)) return ANIMATION_CSS_RE.test(file) || ANIMATION_LIB_RE.test(file);
    try {
      const content = readFileSync(abs, "utf8");
      return ANIMATION_CSS_RE.test(content) || ANIMATION_LIB_RE.test(content);
    } catch {
      return false;
    }
  });
}

export interface AnimationSample {
  interaction: string;
  durationMs: number;
  inputDelayMs: number;
  longTaskMs: number;
  layoutShiftDuring: number;
  interrupted: boolean;
  finalStateOk: boolean;
  concurrentAnimations: number;
  respectsReducedMotion: boolean;
}

export function reviewAnimationSample(
  sample: AnimationSample,
  config: AutoreviewConfig,
): Finding[] {
  const findings: Finding[] = [];

  if (sample.inputDelayMs > 100) {
    findings.push({
      id: `anim-delay-${sample.interaction}`,
      category: "animation",
      severity: "high",
      confidence: 0.9,
      explanation: `Delayed response after input (${sample.inputDelayMs}ms) for "${sample.interaction}"`,
      recommendedFix: "Start visual feedback within 100ms of input",
      source: "deterministic",
    });
  }

  if (sample.longTaskMs > 50) {
    findings.push({
      id: `anim-longtask-${sample.interaction}`,
      category: "animation",
      severity: "medium",
      confidence: 0.85,
      explanation: `Long main-thread task (${sample.longTaskMs}ms) during animation`,
      recommendedFix: "Move heavy work off the animation frame / use compositor-friendly props",
      source: "deterministic",
    });
  }

  if (sample.layoutShiftDuring > 0.05) {
    findings.push({
      id: `anim-cls-${sample.interaction}`,
      category: "animation",
      severity: "high",
      confidence: 0.9,
      explanation: "Layout shifts during animation",
      recommendedFix: "Animate transform/opacity only; avoid layout-inducing properties",
      source: "deterministic",
    });
  }

  if (!sample.interrupted && sample.durationMs > 0) {
    // contextual — do not fail purely on duration
    const outsidePreferred =
      sample.durationMs > config.animation.sceneMaxMs ||
      (sample.durationMs < config.animation.microMinMs && sample.durationMs > 0);
    if (outsidePreferred) {
      findings.push({
        id: `anim-duration-${sample.interaction}`,
        category: "animation",
        severity: "low",
        confidence: 0.6,
        explanation: `Transition duration ${sample.durationMs}ms is outside preferred ranges; requires contextual evaluation`,
        recommendedFix: "Justify duration or move toward preferred micro/component ranges",
        source: "deterministic",
      });
    }
  }

  if (!sample.finalStateOk) {
    findings.push({
      id: `anim-final-${sample.interaction}`,
      category: "animation",
      severity: "critical",
      confidence: 0.95,
      explanation: "Incorrect final state after animation",
      recommendedFix: "Ensure end state matches expected UI after transition completes",
      source: "deterministic",
    });
  }

  if (sample.concurrentAnimations > 2) {
    findings.push({
      id: `anim-concurrent-${sample.interaction}`,
      category: "animation",
      severity: "medium",
      confidence: 0.8,
      explanation: "Multiple concurrent animations competing for attention",
      recommendedFix: "Sequence or reduce concurrent motion",
      source: "deterministic",
    });
  }

  if (!sample.respectsReducedMotion) {
    findings.push({
      id: `anim-reduced-${sample.interaction}`,
      category: "accessibility",
      severity: "high",
      confidence: 0.9,
      explanation: "Missing reduced-motion behavior",
      recommendedFix: "Honor prefers-reduced-motion with shortened/disabled animation",
      source: "deterministic",
    });
  }

  return findings;
}
