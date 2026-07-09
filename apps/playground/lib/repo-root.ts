import { existsSync } from "fs";
import { dirname, join } from "path";

export function findArsenalRepoRoot(start = process.cwd()): string {
  let dir = start;
  while (true) {
    if (existsSync(join(dir, ".arsenal", "config.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}
