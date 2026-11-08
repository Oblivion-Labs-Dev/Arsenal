// Provider-neutral LLM contracts, ported from Kaka packages/ai/src/llm/types.ts.
import type { z } from 'zod/v4';

/**
 * Two tiers instead of model names. Business logic asks for "reasoning" or "fast"; which model
 * that is lives in configuration, per provider.
 */
export type ModelTier = 'reasoning' | 'fast';

export interface ModelUsage {
  provider: string;
  model: string;
  operation: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  firstTokenMs: number | null;
  ok: boolean;
}

export interface StructuredRequest<T> {
  /** Per-operation output cap; defaults to the provider's `maxOutputTokens`. */
  maxOutputTokens?: number;
  tier: ModelTier;
  /** What the call is for, e.g. "story.extract". Recorded with its usage. */
  operation: string;
  /** Bumped whenever `instructions` change, so outputs can be traced to a prompt. */
  promptVersion: string;
  /** Our instructions. Never contains user-supplied text. */
  instructions: string;
  /** User-supplied material, sent as delimited data the instructions tell the model not to obey. */
  data: Record<string, unknown>;
  schemaName: string;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}

export interface TextStreamRequest {
  tier: ModelTier;
  operation: string;
  promptVersion: string;
  instructions: string;
  data: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface LlmProvider {
  readonly name: string;
  /** Returns schema-valid data or throws; never a half-parsed object. */
  generateStructured<T>(request: StructuredRequest<T>): Promise<T>;
  /** Yields text as it arrives. Aborting the signal stops generation and billing. */
  streamText(request: TextStreamRequest): AsyncIterable<string>;
}

export type UsageSink = (usage: ModelUsage) => void | Promise<void>;
