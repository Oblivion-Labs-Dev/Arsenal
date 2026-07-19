import { createHash } from "node:crypto";
import type { ExtractedFeedback, MemoryRule } from "./types.js";

const APPROVE_RE =
  /\b(looks good|approved|this version|keep this|feels right|ship it|perfect)\b/i;
const REJECT_RE =
  /\b(reject|too generic|do not|don't|never|hate this|feels cheap|too much glow)\b/i;
const CORRECT_RE =
  /\b(overlaps?|clipp|overflow|delay|animation|too much information|generic|edge|focus|gap|spacing)\b/i;
const GLOBAL_RE =
  /\b(everywhere|across the app|repository-wide|always|globally|site-wide)\b/i;
const COMPONENT_HINT = /\b(card|button|modal|nav|header|footer|sidebar|hero|form|badge|icon)\b/i;
const ROUTE_HINT = /\/[\w\-/:]+/;
const VIEWPORT_HINT = /\b(mobile|desktop|tablet)\b/i;

function ruleId(text: string, scope: string): string {
  return createHash("sha256").update(`${scope}:${text}`).digest("hex").slice(0, 12);
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Deterministic feedback extractor — preserves local scope, avoids silent globalization.
 */
export function extractFeedback(input: {
  text: string;
  component?: string;
  route?: string;
  viewport?: string;
}): ExtractedFeedback {
  const text = input.text.trim();
  const isApprove = APPROVE_RE.test(text);
  const isReject = REJECT_RE.test(text);
  const isCorrect = CORRECT_RE.test(text);
  const isGlobal = GLOBAL_RE.test(text);

  let classification: ExtractedFeedback["classification"] = "neutral";
  if (isApprove && isReject) classification = "mixed";
  else if (isApprove) classification = "approved";
  else if (isReject) classification = "rejected";
  else if (isCorrect) classification = "correction";

  const objectiveIssues: string[] = [];
  const subjectivePreferences: string[] = [];
  const explicitConstraints: string[] = [];
  const rejectedPatterns: string[] = [];
  const acceptedPatterns: string[] = [];

  if (/overlap/i.test(text)) objectiveIssues.push("Element overlap reported by user");
  if (/clip/i.test(text)) objectiveIssues.push("Clipping reported by user");
  if (/overflow/i.test(text)) objectiveIssues.push("Overflow reported by user");
  if (/delay|animation/i.test(text)) objectiveIssues.push("Animation timing issue reported by user");
  if (/focus/i.test(text)) objectiveIssues.push("Focus indicator issue reported by user");
  if (/too much information|dense|clutter/i.test(text)) {
    subjectivePreferences.push("Reduce informational density");
  }
  if (/prefer|slightly|tighter spacing|looser spacing|spacing rhythm/i.test(text)) {
    subjectivePreferences.push(text.slice(0, 160));
  }
  if (/generic/i.test(text)) rejectedPatterns.push("Avoid generic template appearance");
  if (/glow|gradient|shadow/i.test(text) && /(too much|less|reduce|don't|do not)/i.test(text)) {
    rejectedPatterns.push("Reduce decorative glow/gradient/shadow intensity");
  }
  if (/more alive|feel more alive/i.test(text)) {
    subjectivePreferences.push("Increase perceived aliveness without adding visual noise");
  }
  if (/keep this background/i.test(text)) {
    explicitConstraints.push("Preserve the current background treatment");
  }
  if (isApprove) acceptedPatterns.push(text.slice(0, 160));
  if (isReject) rejectedPatterns.push(text.slice(0, 160));
  if (/\bmust\b|\bdo not\b|\bdon't\b|\bnever\b/i.test(text)) {
    explicitConstraints.push(text.slice(0, 200));
  }

  const component =
    input.component ??
    (COMPONENT_HINT.exec(text)?.[0]?.toLowerCase());
  const route = input.route ?? ROUTE_HINT.exec(text)?.[0];
  const viewport =
    input.viewport ?? VIEWPORT_HINT.exec(text)?.[0]?.toLowerCase();

  const mk = (scope: MemoryRule["scope"], level: MemoryRule["level"], body: string): MemoryRule => ({
    id: ruleId(body, scope),
    level,
    scope,
    text: body,
    tags: [classification, ...(component ? [component] : [])],
    component,
    route,
    viewport,
    confidence: isGlobal || explicitConstraints.length ? 0.9 : 0.7,
    occurrences: 1,
    createdAt: now(),
    updatedAt: now(),
    sourceFeedbackIds: [],
    explicit: Boolean(isGlobal || /\bmust\b|\bnever\b/i.test(text)),
  });

  const componentRules: MemoryRule[] = [];
  const routeRules: MemoryRule[] = [];
  const repositoryRules: MemoryRule[] = [];
  const temporaryRules: MemoryRule[] = [];

  const preferenceBodies = [
    ...objectiveIssues,
    ...subjectivePreferences,
    ...rejectedPatterns,
    ...acceptedPatterns,
    ...explicitConstraints,
  ];

  for (const body of preferenceBodies) {
    if (isGlobal) repositoryRules.push(mk("repository", "repository", body));
    else if (component) componentRules.push(mk("component", "observation", body));
    else if (route) routeRules.push(mk("route", "observation", body));
    else temporaryRules.push(mk("temporary", "observation", body));
  }

  const confidence =
    classification === "neutral"
      ? 0.4
      : objectiveIssues.length
        ? 0.85
        : explicitConstraints.length
          ? 0.9
          : 0.7;

  return {
    classification,
    objectiveIssues,
    subjectivePreferences,
    explicitConstraints,
    rejectedPatterns,
    acceptedPatterns,
    componentRules,
    routeRules,
    repositoryRules,
    temporaryRules,
    confidence,
    needsUserConfirmation:
      classification === "approved" ||
      (classification === "mixed" && subjectivePreferences.length > 0),
    sourceText: text,
    detectedComponent: component,
    detectedRoute: route,
    detectedViewport: viewport,
  };
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
