/** Edit-distance helpers (from CareerOS extension `fuzzyMatcher.ts`). Two-row DP, O(min) memory. */

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Keep the shorter string as the row to save memory.
  const [s, t] = a.length < b.length ? [a, b] : [b, a];
  let prev = Array.from({ length: s.length + 1 }, (_, i) => i);
  let curr = new Array<number>(s.length + 1).fill(0);
  for (let j = 1; j <= t.length; j++) {
    curr[0] = j;
    for (let i = 1; i <= s.length; i++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[i] = Math.min(prev[i]! + 1, curr[i - 1]! + 1, prev[i - 1]! + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[s.length]!;
}

/** Similarity in [0, 1]: 1 means identical, 0 means nothing in common. */
export function stringSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLength;
}
