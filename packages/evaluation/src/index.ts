export interface Evaluator<T, R> {
  evaluate(input: T): Promise<R>;
}
