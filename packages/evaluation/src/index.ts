export interface Evaluator<T, R> {
  evaluate(input: T): Promise<R>;
}

export * from './grounding.js';
export * from './contradictions.js';
export * from './dates.js';
export * from './source-text.js';
