// Token pricing tables and cost calculation. Ported from Sutra packages/ai/src/pricing.ts.
// Prices are configuration, not code: no built-in table ships here, because provider prices
// change and a stale default would report wrong costs. An unpriced model gives `costUsd: null`.
import { readFileSync } from 'node:fs';
import { AppError } from '../errors/AppError.js';

export interface ModelPricingTier {
  readonly inputCostPerMillion: number;
  readonly outputCostPerMillion: number;
  readonly cacheReadCostPerMillion?: number;
  readonly cacheWriteCostPerMillion?: number;
}

export interface AiPricingConfig {
  readonly version: string;
  readonly models: Record<string, ModelPricingTier>;
  /** Used when no model entry matches. Omit it to get `null` costs for unknown models. */
  readonly fallback?: ModelPricingTier;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

const RATE_KEYS = [
  'inputCostPerMillion',
  'outputCostPerMillion',
  'cacheReadCostPerMillion',
  'cacheWriteCostPerMillion',
] as const;
type RateKey = (typeof RATE_KEYS)[number];

function isRateKey(key: string): key is RateKey {
  return (RATE_KEYS as readonly string[]).includes(key);
}

function parseRate(key: string, raw: string, lineNo: number): number {
  const val = Number.parseFloat(raw);
  if (!Number.isFinite(val) || val < 0) {
    throw new Error(`Pricing line ${lineNo}: ${key} must be a non-negative number, got "${raw}"`);
  }
  return val;
}

function assertTier(name: string, tier: Partial<ModelPricingTier>): ModelPricingTier {
  if (tier.inputCostPerMillion === undefined || tier.outputCostPerMillion === undefined) {
    throw new Error(`Pricing for ${name} needs inputCostPerMillion and outputCostPerMillion`);
  }
  return tier as ModelPricingTier;
}

/**
 * Parses JSON, or a small YAML subset without dependencies:
 *
 *   version: "2026-10-13"
 *   fallback:
 *     inputCostPerMillion: 1
 *     outputCostPerMillion: 3
 *   models:
 *     some-model:
 *       inputCostPerMillion: 0.14
 *       outputCostPerMillion: 0.28
 */
export function parsePricingText(text: string): AiPricingConfig {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as Partial<AiPricingConfig>;
    if (typeof parsed.version !== 'string' || !parsed.models || typeof parsed.models !== 'object') {
      throw new Error('Pricing JSON needs a "version" string and a "models" object');
    }
    const models: Record<string, ModelPricingTier> = {};
    for (const [name, tier] of Object.entries(parsed.models)) {
      models[name.toLowerCase()] = assertTier(name, tier);
    }
    return {
      version: parsed.version,
      models,
      ...(parsed.fallback ? { fallback: assertTier('fallback', parsed.fallback) } : {}),
    };
  }

  let version: string | null = null;
  const models: Record<string, Partial<Record<RateKey, number>>> = {};
  let fallback: Partial<Record<RateKey, number>> | null = null;
  let section: 'fallback' | 'models' | null = null;
  let currentModel: string | null = null;

  trimmed.split(/\r?\n/).forEach((line, index) => {
    const lineNo = index + 1;
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) return;
    if (!line.startsWith(' ')) {
      if (raw.startsWith('version:')) {
        version = raw.replace(/^version:\s*["']?/, '').replace(/["']?\s*$/, '');
      } else if (raw === 'fallback:') {
        section = 'fallback';
        fallback = {};
      } else if (raw === 'models:') {
        section = 'models';
      } else {
        throw new Error(`Pricing line ${lineNo}: unexpected "${raw}"`);
      }
      currentModel = null;
      return;
    }
    if (section === 'models' && !line.startsWith('    ') && raw.endsWith(':')) {
      currentModel = raw
        .slice(0, -1)
        .replace(/^["']|["']$/g, '')
        .toLowerCase();
      models[currentModel] = {};
      return;
    }
    const colon = raw.indexOf(':');
    const key = colon > 0 ? raw.slice(0, colon).trim() : raw;
    if (!isRateKey(key)) throw new Error(`Pricing line ${lineNo}: unknown field "${key}"`);
    const val = parseRate(key, raw.slice(colon + 1).trim(), lineNo);
    if (section === 'fallback' && fallback) fallback[key] = val;
    else if (section === 'models' && currentModel) models[currentModel]![key] = val;
    else throw new Error(`Pricing line ${lineNo}: "${key}" is outside a model or fallback block`);
  });

  if (version === null) throw new Error('Pricing needs a "version:" line');
  const tiers: Record<string, ModelPricingTier> = {};
  for (const [name, tier] of Object.entries(models)) tiers[name] = assertTier(name, tier);
  return {
    version,
    models: tiers,
    ...(fallback ? { fallback: assertTier('fallback', fallback) } : {}),
  };
}

/** Reads and parses a pricing file. Throws a typed error if it is missing or invalid. */
export function loadPricingFile(path: string): AiPricingConfig {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (cause) {
    throw new AppError(`Could not read pricing file ${path}`, {
      code: 'PRICING_FILE_UNREADABLE',
      ...(cause instanceof Error ? { cause } : {}),
    });
  }
  try {
    return parsePricingText(raw);
  } catch (cause) {
    throw new AppError(
      `Pricing file ${path} is invalid: ${cause instanceof Error ? cause.message : String(cause)}`,
      { code: 'PRICING_FILE_INVALID', ...(cause instanceof Error ? { cause } : {}) },
    );
  }
}

/**
 * Exact slug, then the slug without a provider prefix ("openai/gpt-x" → "gpt-x"), then the
 * longest configured prefix ("model-20241022" → "model"), then the fallback, else `null`.
 */
export function lookupPricing(config: AiPricingConfig, model: string): ModelPricingTier | null {
  const norm = model.toLowerCase();
  const exact = config.models[norm];
  if (exact) return exact;
  const slash = norm.indexOf('/');
  if (slash >= 0) {
    const bare = config.models[norm.slice(slash + 1)];
    if (bare) return bare;
  }
  let best: [string, ModelPricingTier] | null = null;
  for (const entry of Object.entries(config.models)) {
    if (norm.startsWith(entry[0]) && (!best || entry[0].length > best[0].length)) best = entry;
  }
  return best?.[1] ?? config.fallback ?? null;
}

/** USD cost of one call, rounded to 6 decimals; `null` when the model has no price. */
export function calculateAiCost(
  config: AiPricingConfig,
  model: string,
  usage: TokenUsage,
): { costUsd: number | null; pricingVersion: string } {
  const tier = lookupPricing(config, model);
  if (!tier) return { costUsd: null, pricingVersion: config.version };
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const cacheRead = usage.cacheReadTokens ?? 0;
  const cacheWrite = usage.cacheWriteTokens ?? 0;
  const inputRate = tier.inputCostPerMillion;
  const cacheReadRate = tier.cacheReadCostPerMillion ?? inputRate;
  const cacheWriteRate = tier.cacheWriteCostPerMillion ?? inputRate;
  // Cached reads are part of the reported input tokens but billed at their own rate.
  const uncachedInput = Math.max(0, input - cacheRead);
  const cost =
    (uncachedInput * inputRate +
      output * tier.outputCostPerMillion +
      cacheRead * cacheReadRate +
      cacheWrite * cacheWriteRate) /
    1_000_000;
  return { costUsd: Math.round(cost * 1_000_000) / 1_000_000, pricingVersion: config.version };
}
