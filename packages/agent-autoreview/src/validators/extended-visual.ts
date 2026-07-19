import type { Finding } from "../types.js";
import {
  detectDecorativeLineCollisions,
  type DecorativeScene,
  type Rect,
} from "./decorative-lines.js";
import type { DeterministicVisualSnapshot } from "./visual-deterministic.js";

export interface ExtendedVisualOptions {
  allowOverlapSelectors?: string[];
  githubPagesBasePath?: string;
  assetUrls?: string[];
  decorativeScene?: DecorativeScene;
  focusRingSamples?: Array<{
    selector: string;
    outlineRect: Rect;
    clippedBy?: Rect;
  }>;
}

function toRect(r: {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
}): Rect {
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    right: r.right,
    bottom: r.bottom,
  };
}

export function runExtendedVisualChecks(
  snapshot: DeterministicVisualSnapshot,
  scopeLabel: string,
  options: ExtendedVisualOptions = {},
): Finding[] {
  const findings: Finding[] = [];
  let i = 0;
  const next = (prefix: string) => `${prefix}-${++i}`;

  for (const el of snapshot.elements) {
    // Focus-ring clipping: focusable with outline that extends outside a clipping ancestor heuristic
    if (el.focusable && el.hasFocusIndicator && el.rect.width > 0) {
      const ring = toRect(el.rect);
      // If document can't fit outline inflation (~2px), flag potential clipping near edges
      if (
        ring.x < 2 ||
        ring.y < 2 ||
        ring.right > snapshot.viewportWidth - 2 ||
        ring.bottom > snapshot.viewportHeight - 2
      ) {
        findings.push({
          id: next("focus-ring-edge"),
          category: "accessibility",
          severity: "high",
          confidence: 0.8,
          selector: el.selector,
          explanation: `Focus indicator on ${el.selector} sits against viewport edge and may be clipped in ${scopeLabel}`,
          recommendedFix: "Add padding/margin so :focus-visible rings are fully visible",
          source: "deterministic",
        });
      }
    }
  }

  for (const sample of options.focusRingSamples ?? []) {
    if (!sample.clippedBy) continue;
    const a = sample.outlineRect;
    const b = sample.clippedBy;
    const clipped =
      a.x < b.x || a.y < b.y || a.right > b.right || a.bottom > b.bottom;
    if (clipped) {
      findings.push({
        id: next("focus-ring-clip"),
        category: "accessibility",
        severity: "critical",
        confidence: 0.95,
        selector: sample.selector,
        explanation: `Focus ring clipped by overflow container for ${sample.selector}`,
        recommendedFix: "Remove overflow:hidden on focus container or inset the control",
        source: "deterministic",
      });
    }
  }

  if (options.decorativeScene) {
    for (const hit of detectDecorativeLineCollisions(options.decorativeScene)) {
      findings.push({
        id: hit.id,
        category: "visual",
        severity: hit.severity,
        confidence: hit.confidence,
        selector: hit.targetSelector,
        explanation: hit.explanation,
        recommendedFix: hit.recommendedFix,
        source: "deterministic",
      });
    }
  }

  // GitHub Pages base-path failures
  if (options.githubPagesBasePath) {
    const base = options.githubPagesBasePath.replace(/\/$/, "");
    for (const url of options.assetUrls ?? []) {
      if (!url || url.startsWith("data:") || url.startsWith("http") || url.startsWith("//")) {
        continue;
      }
      if (url.startsWith("/") && !url.startsWith(`${base}/`) && url !== base) {
        findings.push({
          id: next("gh-pages-base"),
          category: "runtime",
          severity: "critical",
          confidence: 0.9,
          explanation: `Asset path ${url} ignores GitHub Pages base path ${base}`,
          recommendedFix: `Prefix asset with base path ${base} or use relative URLs`,
          source: "deterministic",
        });
      }
    }
  }

  // Filter intentional overlaps via allowlist
  if (options.allowOverlapSelectors?.length) {
    return findings.filter((f) => {
      if (!f.id.includes("overlap") || !f.selector) return true;
      return !options.allowOverlapSelectors!.some((sel) => f.selector!.includes(sel));
    });
  }

  return findings;
}
