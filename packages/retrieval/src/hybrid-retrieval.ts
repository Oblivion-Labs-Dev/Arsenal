import { scoreText, tokenizeQuery } from "@arsenal/core";

export interface RetrievalCandidate {
  id: string;
  path: string;
  text: string;
  symbols?: string[];
  module?: string;
  dependencyDistance?: number;
  recentEditScore?: number;
  gitFrequency?: number;
  taskRelevance?: number;
}

export interface RetrievalWeights {
  task: number;
  symbol: number;
  dependency: number;
  recent: number;
  git: number;
  tfidf: number;
}

const DEFAULT_WEIGHTS: RetrievalWeights = {
  task: 3,
  symbol: 2,
  dependency: 2,
  recent: 1.5,
  git: 1,
  tfidf: 1,
};

export interface HybridRetrievalOptions {
  query: string;
  candidates: RetrievalCandidate[];
  limit?: number;
  weights?: Partial<RetrievalWeights>;
}

export function hybridRetrieve(options: HybridRetrievalOptions): RetrievalCandidate[] {
  const terms = tokenizeQuery(options.query);
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights };

  const scored = options.candidates.map((c) => {
    const tfidf = scoreText(c.text, terms);
    const symbol = (c.symbols ?? []).filter((s) => terms.some((t) => s.toLowerCase().includes(t))).length;
    const task = c.taskRelevance ?? scoreText(`${c.path} ${c.module ?? ""}`, terms);
    const dep = c.dependencyDistance != null ? Math.max(0, 5 - c.dependencyDistance) : 0;
    const recent = c.recentEditScore ?? 0;
    const git = c.gitFrequency ?? 0;

    const total =
      tfidf * weights.tfidf +
      symbol * weights.symbol +
      task * weights.task +
      dep * weights.dependency +
      recent * weights.recent +
      git * weights.git;

    return { candidate: c, score: total };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 20)
    .map((s) => s.candidate);
}

export function buildTfIdfIndex(docs: { id: string; text: string }[]): Map<string, Map<string, number>> {
  const df = new Map<string, number>();
  const tfMaps = new Map<string, Map<string, number>>();

  for (const doc of docs) {
    const terms = tokenizeQuery(doc.text);
    const tf = new Map<string, number>();
    const seen = new Set<string>();
    for (const t of terms) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
      if (!seen.has(t)) {
        df.set(t, (df.get(t) ?? 0) + 1);
        seen.add(t);
      }
    }
    tfMaps.set(doc.id, tf);
  }

  const n = docs.length;
  const result = new Map<string, Map<string, number>>();
  for (const [id, tf] of tfMaps) {
    const weighted = new Map<string, number>();
    for (const [term, count] of tf) {
      const idf = Math.log((n + 1) / ((df.get(term) ?? 0) + 1)) + 1;
      weighted.set(term, count * idf);
    }
    result.set(id, weighted);
  }
  return result;
}
