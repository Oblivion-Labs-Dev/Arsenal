// Ported from Kaka `packages/career/src/contradictions.ts` (same owner), generalised from career
// records to any labelled measurement.

export interface MetricClaim<S = unknown> {
  /** Where the claim came from; claims from the same `sourceId` are never compared. */
  sourceId: string;
  source?: S;
  /** The words that say what was measured, e.g. "p95 latency". */
  label: string;
  value: number;
  /** "%", "ms", "engineers", or "" for a bare count. */
  unit: string;
  /** Shown to the user next to the value. */
  context: string;
}

export interface Contradiction<S = unknown> {
  subject: string;
  a: MetricClaim<S>;
  b: MetricClaim<S>;
  /** Share of label words in common, 0..1. */
  similarity: number;
}

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'by',
  'to',
  'for',
  'and',
  'with',
  'from',
  'at',
  'is',
  'was',
  'were',
  'are',
  'our',
  'its',
  'their',
  'we',
  'it',
  'that',
  'this',
  'about',
  'around',
  'over',
  'under',
  'than',
  'up',
  'down',
  'nearly',
  'almost',
  'roughly',
  'approximately',
  'reduction',
  'improvement',
  'increase',
  'decrease',
  'improved',
  'reduced',
  'increased',
  'decreased',
  'cut',
  'grew',
  'rose',
  'fell',
  'dropped',
  'saw',
  'had',
  'has',
  'have',
]);

export interface ContradictionOptions {
  /** Minimum label overlap to treat two claims as the same subject. Default 0.6. */
  minSimilarity?: number;
  /** Minimum shared label words. Default 2: one shared word is too weak a signal. */
  minSharedTerms?: number;
}

/**
 * Finds the same measurement stated two different ways ("20% faster p95" against "35% faster
 * p95"): same unit, clearly the same subject, different value. It flags and never picks a
 * winner. Deliberately strict about "same subject": a missed contradiction costs less than
 * flagging two different numbers.
 */
export function findContradictions<S>(
  claims: MetricClaim<S>[],
  options: ContradictionOptions = {},
): Contradiction<S>[] {
  const minSimilarity = options.minSimilarity ?? 0.6;
  const minShared = options.minSharedTerms ?? 2;
  const found: Contradiction<S>[] = [];
  const seen = new Set<string>();
  const termSets = claims.map((c) => labelTerms(c.label));
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const a = claims[i]!;
      const b = claims[j]!;
      if (a.sourceId === b.sourceId) continue;
      if (normalizeUnit(a.unit) !== normalizeUnit(b.unit)) continue;
      if (a.value === b.value) continue;
      const { score, shared } = overlap(termSets[i]!, termSets[j]!);
      if (score < minSimilarity || shared < minShared) continue;
      const key = [a.sourceId, b.sourceId, a.value, b.value].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ subject: a.label, a, b, similarity: score });
    }
  }
  return found;
}

export function labelTerms(label: string): Set<string> {
  return new Set(
    label
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w)),
  );
}

function overlap(a: Set<string>, b: Set<string>): { score: number; shared: number } {
  if (a.size === 0 || b.size === 0) return { score: 0, shared: 0 };
  let shared = 0;
  for (const term of a) if (b.has(term)) shared++;
  return { score: shared / Math.min(a.size, b.size), shared };
}

export function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase();
  if (u === 'percent' || u === 'pct' || u === 'per cent') return '%';
  return u;
}
