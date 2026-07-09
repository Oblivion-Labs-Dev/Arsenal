export interface AstSymbol {
  name: string;
  kind: "class" | "function" | "interface" | "type" | "variable" | "component";
  exported: boolean;
  line?: number;
}

const EXPORT_FN = /export\s+(?:async\s+)?function\s+(\w+)/g;
const EXPORT_CLASS = /export\s+class\s+(\w+)/g;
const EXPORT_CONST = /export\s+(?:const|let)\s+(\w+)/g;
const EXPORT_TYPE = /export\s+(?:type|interface)\s+(\w+)/g;
const EXPORT_DEFAULT_FN = /export\s+default\s+(?:async\s+)?function\s+(\w+)?/g;
const COMPONENT = /export\s+(?:default\s+)?function\s+([A-Z]\w*)/g;

export function extractAstSymbols(content: string): AstSymbol[] {
  const symbols: AstSymbol[] = [];
  const seen = new Set<string>();

  function add(name: string, kind: AstSymbol["kind"], exported: boolean) {
    if (!name || seen.has(name)) return;
    seen.add(name);
    symbols.push({ name, kind, exported });
  }

  for (const match of content.matchAll(EXPORT_CLASS)) add(match[1]!, "class", true);
  for (const match of content.matchAll(EXPORT_FN)) add(match[1]!, "function", true);
  for (const match of content.matchAll(EXPORT_CONST)) add(match[1]!, "variable", true);
  for (const match of content.matchAll(EXPORT_TYPE)) add(match[1]!, "type", true);
  for (const match of content.matchAll(EXPORT_DEFAULT_FN)) {
    if (match[1]) add(match[1], "function", true);
  }
  for (const match of content.matchAll(COMPONENT)) add(match[1]!, "component", true);

  return symbols;
}

export function hasSideEffects(content: string): string[] {
  const effects: string[] = [];
  if (/process\.env/.test(content)) effects.push("reads environment variables");
  if (/fetch\(|axios\.|http\./.test(content)) effects.push("network I/O");
  if (/writeFile|createWriteStream|fs\./.test(content)) effects.push("filesystem I/O");
  if (/console\.(log|warn|error)/.test(content)) effects.push("console output");
  return effects;
}
