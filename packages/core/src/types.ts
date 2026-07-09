/** Progressive context expansion levels — higher = more raw source */
export enum ContextLevel {
  Architecture = 0,
  Module = 1,
  Class = 2,
  Function = 3,
  Source = 4,
}

export type AgentVendor = "claude" | "cursor" | "codex" | "gemini" | "openai" | "unknown";

export interface ArsenalFeatureFlags {
  budgetEngine: boolean;
  contextCompiler: boolean;
  semanticRetrieval: boolean;
  embeddings: boolean;
  policyEngine: boolean;
  learningEngine: boolean;
  terminalInterceptor: boolean;
  deduplication: boolean;
  gitIntelligence: boolean;
}

export const DEFAULT_FEATURE_FLAGS: ArsenalFeatureFlags = {
  budgetEngine: true,
  contextCompiler: true,
  semanticRetrieval: false,
  embeddings: false,
  policyEngine: true,
  learningEngine: true,
  terminalInterceptor: false,
  deduplication: true,
  gitIntelligence: false,
};

export interface PluginContext {
  repoRoot: string;
  vendor: AgentVendor;
}

export interface ArsenalPlugin<TConfig = unknown> {
  id: string;
  version: string;
  configure?(config: TConfig): void;
}

export interface EmbeddingProvider extends ArsenalPlugin {
  embed(texts: string[]): Promise<number[][]>;
}

export interface SummarizerProvider extends ArsenalPlugin {
  summarize(text: string, maxTokens: number): Promise<string>;
}

export interface KnowledgeGraphProvider extends ArsenalPlugin {
  query(expression: string): Promise<unknown[]>;
}

export interface BudgetProvider extends ArsenalPlugin {
  estimate(text: string): number;
  enforceBudget(items: { content: string; priority: number }[], max: number): unknown;
}

export interface PluginRegistry {
  register(plugin: ArsenalPlugin): void;
  get<T extends ArsenalPlugin>(id: string): T | undefined;
  list(): string[];
}

export class DefaultPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, ArsenalPlugin>();

  register(plugin: ArsenalPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  get<T extends ArsenalPlugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  list(): string[] {
    return [...this.plugins.keys()];
  }
}
