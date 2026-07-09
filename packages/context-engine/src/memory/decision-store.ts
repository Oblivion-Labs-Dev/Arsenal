import { MemoryStore } from "./memory-store.js";
import { parseDecisions } from "../summaries/decision-summarizer.js";

export class DecisionStore {
  private store: MemoryStore;

  constructor(repoRoot: string) {
    this.store = new MemoryStore(repoRoot);
  }

  readAll(): string[] {
    return parseDecisions(this.store.read("decisions.md"));
  }

  readRaw(): string {
    return this.store.read("decisions.md");
  }
}
