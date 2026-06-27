import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsupCli = require.resolve("tsup/dist/cli-default.js", { paths: [root] });
const packages = ["shared", "backend", "frontend"];

for (const name of packages) {
  const cwd = path.join(root, "packages", name);
  console.log(`\nBuilding @oblivion-labs/arsenal-${name}...`);
  execSync(`node "${tsupCli}"`, { cwd, stdio: "inherit" });
}

console.log("\nAll packages built successfully.");
