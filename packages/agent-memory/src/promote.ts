import type { ExtractedFeedback, MemoryIndex, MemoryRule } from "./types.js";
import { loadIndex, saveIndex, upsertRule } from "./store.js";

/**
 * Apply extracted feedback into memory with promotion rules:
 * - subjective defaults to observation
 * - component rule after explicit component preference or 2 occurrences
 * - repository rule only if explicit global OR confirmed across 3 components/tasks
 */
export function applyFeedback(
  cwd: string,
  extracted: ExtractedFeedback,
  feedbackId: string,
): MemoryIndex {
  const index = loadIndex(cwd);
  const candidates = [
    ...extracted.componentRules,
    ...extracted.routeRules,
    ...extracted.repositoryRules,
    ...extracted.temporaryRules,
  ];

  for (const incoming of candidates) {
    const duplicate = index.rules.find(
      (r) =>
        !r.supersededBy &&
        normalize(r.text) === normalize(incoming.text) &&
        r.component === incoming.component &&
        r.route === incoming.route,
    );

    if (duplicate) {
      const promoted = promoteRule({
        ...duplicate,
        occurrences: duplicate.occurrences + 1,
        updatedAt: new Date().toISOString(),
        sourceFeedbackIds: [...new Set([...duplicate.sourceFeedbackIds, feedbackId])],
        explicit: duplicate.explicit || incoming.explicit,
      });
      const idx = index.rules.findIndex((r) => r.id === duplicate.id);
      index.rules[idx] = promoted;
      continue;
    }

    // Contradiction detection
    const contradiction = index.rules.find(
      (r) =>
        !r.supersededBy &&
        r.component === incoming.component &&
        r.route === incoming.route &&
        conflicts(r.text, incoming.text),
    );
    if (contradiction) {
      // Prefer recent explicit direction
      if (incoming.explicit || incoming.confidence >= contradiction.confidence) {
        contradiction.supersededBy = incoming.id;
        incoming.sourceFeedbackIds = [feedbackId];
        index.rules.push(incoming);
      }
      continue;
    }

    let rule: MemoryRule = {
      ...incoming,
      sourceFeedbackIds: [feedbackId],
      level: incoming.explicit && incoming.scope === "repository" ? "repository" : "observation",
    };
    rule = promoteRule(rule);
    index.rules.push(rule);
  }

  for (const pattern of extracted.rejectedPatterns) {
    if (!index.antiPatterns.includes(pattern)) index.antiPatterns.push(pattern);
  }
  for (const pref of extracted.subjectivePreferences) {
    index.preferences[hashKey(pref)] = pref;
  }

  saveIndex(cwd, index);
  return index;
}

export function promoteRule(rule: MemoryRule): MemoryRule {
  let level = rule.level;
  if (rule.explicit && rule.scope === "repository") {
    level = "repository";
  } else if (rule.explicit && rule.component) {
    level = "component";
  } else if (rule.component && rule.occurrences >= 2) {
    level = "component";
  } else if (rule.scope === "route" && rule.occurrences >= 2) {
    level = "route";
  } else if (!rule.component && !rule.route && rule.occurrences >= 3 && rule.explicit) {
    level = "repository";
  }

  // Repository promotion across components requires 3 distinct components — checked by caller via occurrences + multi-component matching
  return { ...rule, level };
}

export function promoteAcrossComponents(cwd: string): MemoryIndex {
  const index = loadIndex(cwd);
  const byText = new Map<string, MemoryRule[]>();
  for (const rule of index.rules) {
    if (rule.supersededBy) continue;
    const key = normalize(rule.text);
    const list = byText.get(key) ?? [];
    list.push(rule);
    byText.set(key, list);
  }
  for (const [, group] of byText) {
    const components = new Set(group.map((r) => r.component).filter(Boolean));
    if (components.size >= 3 || group.some((r) => r.explicit && r.scope === "repository")) {
      for (const rule of group) {
        rule.level = "repository";
        rule.scope = "repository";
        upsertRule(cwd, rule);
      }
    }
  }
  return loadIndex(cwd);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function conflicts(a: string, b: string): boolean {
  const pair = [
    [/more glow|increase glow/i, /less glow|reduce glow|no glow|do not.*glow/i],
    [/keep background/i, /remove background|change background/i],
    [/more dense|more information/i, /less information|reduce density|too much information/i],
  ];
  return pair.some(
    ([x, y]) => (x.test(a) && y.test(b)) || (y.test(a) && x.test(b)),
  );
}

function hashKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
}
