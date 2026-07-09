import { normalizePath } from "../core/paths.js";

export interface TestLink {
  testFile: string;
  targetFile: string;
  testName?: string;
}

export interface TestIndex {
  version: string;
  generatedAt: string;
  tests: TestLink[];
  testFiles: string[];
}

function guessSourceForTest(testPath: string): string | null {
  const normalized = normalizePath(testPath);
  const candidates = [
    normalized.replace(/\.test\.(ts|tsx|js|jsx)$/, ".$1"),
    normalized.replace(/\.spec\.(ts|tsx|js|jsx)$/, ".$1"),
    normalized.replace(/__tests__\//, "").replace(/\.(test|spec)\./, "."),
  ];
  return candidates.find((c) => c !== normalized) ?? null;
}

export function buildTestIndex(files: { path: string; kind: string; content?: string }[]): TestIndex {
  const tests: TestLink[] = [];
  const testFiles: string[] = [];

  for (const file of files) {
    if (file.kind !== "test") continue;
    testFiles.push(file.path);

    let target = guessSourceForTest(file.path);
    if (file.content) {
      const importMatch = file.content.match(/from\s+['"](\.\.?\/[^'"]+)['"]/);
      if (importMatch?.[1]) {
        const base = file.path.split("/").slice(0, -1);
        const parts = importMatch[1].split("/");
        const resolved: string[] = [...base];
        for (const part of parts) {
          if (part === ".") continue;
          if (part === "..") resolved.pop();
          else resolved.push(part);
        }
        target = resolved.join("/");
      }
    }

    if (target) {
      tests.push({ testFile: file.path, targetFile: target });
    }
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    tests,
    testFiles,
  };
}
