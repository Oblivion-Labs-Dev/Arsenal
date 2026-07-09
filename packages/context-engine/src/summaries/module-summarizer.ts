import type { FileSummary } from "../schemas/file-summary.schema.js";

export function summarizeModule(modulePath: string, summaries: FileSummary[]): string {
  const moduleFiles = summaries.filter(
    (s) => s.path.startsWith(`${modulePath}/`) || s.path === modulePath,
  );
  if (moduleFiles.length === 0) return `Module ${modulePath}: no indexed files.`;

  const exports = [...new Set(moduleFiles.flatMap((f) => f.exports))].slice(0, 15);
  const deps = [...new Set(moduleFiles.flatMap((f) => f.dependsOn))].slice(0, 10);
  const tests = [...new Set(moduleFiles.flatMap((f) => f.tests))];

  return [
    `# Module: ${modulePath}`,
    "",
    `Files: ${moduleFiles.length}`,
    `Key exports: ${exports.join(", ") || "none"}`,
    `Depends on: ${deps.join(", ") || "none"}`,
    `Tests: ${tests.join(", ") || "none"}`,
    "",
    "## Files",
    ...moduleFiles.map((f) => `- \`${f.path}\` — ${f.purpose}`),
  ].join("\n");
}
