import { estimateTokens } from "./token-estimator.js";

export interface BudgetItem {
  id: string;
  label: string;
  content: string;
  tokens: number;
  priority: number;
}

export interface BudgetResult {
  selected: BudgetItem[];
  dropped: BudgetItem[];
  totalTokens: number;
  maxTokens: number;
}

export function enforceTokenBudget(items: BudgetItem[], maxTokens: number): BudgetResult {
  const sorted = [...items].sort((a, b) => b.priority - a.priority);
  const selected: BudgetItem[] = [];
  const dropped: BudgetItem[] = [];
  let totalTokens = 0;

  for (const item of sorted) {
    const tokens = item.tokens || estimateTokens(item.content);
    if (totalTokens + tokens <= maxTokens) {
      selected.push({ ...item, tokens });
      totalTokens += tokens;
    } else {
      dropped.push({ ...item, tokens });
    }
  }

  return { selected, dropped, totalTokens, maxTokens };
}

export function selectBudgetForQuery(
  query: string,
  config: { contextBudget: { defaultMaxTokens: number; smallTaskMaxTokens: number; largeTaskMaxTokens: number } },
): number {
  const words = query.split(/\s+/).length;
  if (words <= 5) return config.contextBudget.smallTaskMaxTokens;
  if (words >= 15) return config.contextBudget.largeTaskMaxTokens;
  return config.contextBudget.defaultMaxTokens;
}
