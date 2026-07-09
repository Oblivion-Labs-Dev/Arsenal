import { join } from "path";
import { readTextFile, writeTextFile } from "../core/file-io.js";
import { arsenalPath } from "../core/paths.js";

export class MemoryStore {
  constructor(private repoRoot: string) {}

  read(name: string): string {
    return readTextFile(join(arsenalPath(this.repoRoot), "memory", name));
  }

  write(name: string, content: string): void {
    writeTextFile(join(arsenalPath(this.repoRoot), "memory", name), content);
  }
}
