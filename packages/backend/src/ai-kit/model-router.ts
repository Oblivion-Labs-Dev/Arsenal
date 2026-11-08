// Picks a provider/model per operation from latency budget, remaining spend and a quality floor,
// with a deterministic fallback chain and an explicit reason code. Ported from Sutra
// packages/ai/src/model-router.ts; the candidate tables are now supplied by the caller.

export interface RouteRequest {
  operation: string;
  latencyBudgetMs?: number;
  tenantBudgetRemainingUsd?: number;
  minQualityScore?: number;
  /** Moves this provider's candidates to the front when nothing else constrains the choice. */
  preferredProvider?: string;
}

export type RoutingReasonCode =
  | 'PRIMARY_MATCH'
  | 'LATENCY_FALLBACK'
  | 'BUDGET_FALLBACK'
  | 'QUALITY_THRESHOLD_FALLBACK'
  | 'DEFAULT_FALLBACK';

export interface ModelProfile {
  provider: string;
  model: string;
  typicalLatencyMs: number;
  estimatedCostUsd: number;
  /** 0.0 - 1.0 */
  qualityScore: number;
}

export interface ModelRouteSelection {
  provider: string;
  model: string;
  expectedLatencyMs: number;
  qualityScore: number;
  reasonCode: RoutingReasonCode;
  fallbackChain: Array<{ provider: string; model: string }>;
}

export class ModelRouter {
  /**
   * @param candidates operation → profiles in order of preference (first is primary).
   * @param defaultProfile used for operations with no candidates. Without it, routing an
   *   unknown operation throws.
   */
  constructor(
    private readonly candidates: Record<string, ModelProfile[]>,
    private readonly defaultProfile?: ModelProfile,
  ) {}

  route(request: RouteRequest): ModelRouteSelection {
    const configured = this.candidates[request.operation];
    if (!configured || configured.length === 0) {
      if (!this.defaultProfile) {
        throw new Error(`No model candidates configured for operation "${request.operation}"`);
      }
      return this.#select(this.defaultProfile, [this.defaultProfile], 'DEFAULT_FALLBACK');
    }
    const candidates = request.preferredProvider
      ? [
          ...configured.filter((c) => c.provider === request.preferredProvider),
          ...configured.filter((c) => c.provider !== request.preferredProvider),
        ]
      : configured;
    const primary = candidates[0]!;

    const budget = request.tenantBudgetRemainingUsd;
    if (budget !== undefined && primary.estimatedCostUsd > budget) {
      const affordable = candidates.find((c) => c.estimatedCostUsd <= budget);
      if (affordable) return this.#select(affordable, candidates, 'BUDGET_FALLBACK');
    }
    const latency = request.latencyBudgetMs;
    if (latency !== undefined && primary.typicalLatencyMs > latency) {
      const fast = candidates.find((c) => c.typicalLatencyMs <= latency);
      if (fast) return this.#select(fast, candidates, 'LATENCY_FALLBACK');
    }
    const floor = request.minQualityScore;
    if (floor !== undefined && primary.qualityScore < floor) {
      const good = candidates.find((c) => c.qualityScore >= floor);
      if (good) return this.#select(good, candidates, 'QUALITY_THRESHOLD_FALLBACK');
    }
    return this.#select(primary, candidates, 'PRIMARY_MATCH');
  }

  #select(
    selected: ModelProfile,
    all: ModelProfile[],
    reasonCode: RoutingReasonCode,
  ): ModelRouteSelection {
    return {
      provider: selected.provider,
      model: selected.model,
      expectedLatencyMs: selected.typicalLatencyMs,
      qualityScore: selected.qualityScore,
      reasonCode,
      fallbackChain: all
        .filter((c) => !(c.provider === selected.provider && c.model === selected.model))
        .map((c) => ({ provider: c.provider, model: c.model })),
    };
  }
}
