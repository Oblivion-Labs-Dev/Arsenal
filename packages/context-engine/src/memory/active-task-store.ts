import { MemoryStore } from "./memory-store.js";
import { parseActiveTaskSections, readActiveTaskMarkdown } from "../summaries/task-summarizer.js";
import { arsenalPath } from "../core/paths.js";

export class ActiveTaskStore {
  constructor(private repoRoot: string) {}

  read(): string {
    return readActiveTaskMarkdown(arsenalPath(this.repoRoot));
  }

  parseSections(): Record<string, string[]> {
    return parseActiveTaskSections(this.read());
  }

  write(content: string): void {
    new MemoryStore(this.repoRoot).write("active-task.md", content);
  }
}
