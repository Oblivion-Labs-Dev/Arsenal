import { MemoryStore } from "./memory-store.js";

export class PitfallStore {
  private store: MemoryStore;

  constructor(repoRoot: string) {
    this.store = new MemoryStore(repoRoot);
  }

  readRaw(): string {
    return this.store.read("pitfalls.md");
  }

  readList(): string[] {
    return this.readRaw()
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith("-"))
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
  }
}
