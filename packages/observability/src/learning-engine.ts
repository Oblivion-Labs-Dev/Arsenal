import { generateId, appendJsonl, arsenalPath } from "@arsenal/core";

export interface ObservabilityRecord {
  id: string;
  timestamp: string;
  model: string;
  vendor: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  cacheHit: boolean;
  success: boolean;
  retryCount: number;
  qualityScore?: number;
  retrievalCount?: number;
  contextExpansionLevel?: number;
}

export interface LearningSignals {
  promptQuality: number;
  retrievalSuccess: number;
  filesAccessed: string[];
  tokenUsage: number;
  compressionRatio: number;
  strategy: string;
}

export class LearningEngine {
  constructor(private repoRoot: string) {}

  recordRequest(record: Omit<ObservabilityRecord, "id" | "timestamp">): void {
    const entry: ObservabilityRecord = {
      ...record,
      id: generateId("obs"),
      timestamp: new Date().toISOString(),
    };
    appendJsonl(arsenalPath(this.repoRoot, "analytics/usage-log.jsonl"), entry);
  }

  updateLearning(signals: LearningSignals): void {
    appendJsonl(arsenalPath(this.repoRoot, "analytics/agent-events.jsonl"), {
      timestamp: new Date().toISOString(),
      eventType: "LEARNING_UPDATE",
      metadata: signals,
    });
  }

  computeMetrics(records: ObservabilityRecord[]) {
    if (!records.length) {
      return {
        avgPromptTokens: 0,
        avgCompletionTokens: 0,
        cacheHitRate: 0,
        compressionRatio: 0,
        avgQuality: 0,
        successRate: 0,
      };
    }
    const n = records.length;
    return {
      avgPromptTokens: Math.round(records.reduce((s, r) => s + r.promptTokens, 0) / n),
      avgCompletionTokens: Math.round(records.reduce((s, r) => s + r.completionTokens, 0) / n),
      cacheHitRate: Math.round((records.filter((r) => r.cacheHit).length / n) * 100),
      compressionRatio: 0,
      avgQuality: Math.round(
        records.reduce((s, r) => s + (r.qualityScore ?? 0), 0) / n,
      ),
      successRate: Math.round((records.filter((r) => r.success).length / n) * 100),
    };
  }
}
