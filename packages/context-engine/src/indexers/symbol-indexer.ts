import type { ScannedFile } from "../core/repo-scanner.js";
import { extractAstSymbols } from "./ast-indexer.js";

export interface SymbolEntry {
  name: string;
  kind: string;
  file: string;
  exported: boolean;
  module?: string;
}

export interface SymbolIndex {
  version: string;
  generatedAt: string;
  symbols: SymbolEntry[];
}

export function buildSymbolIndex(files: ScannedFile[]): SymbolIndex {
  const symbols: SymbolEntry[] = [];

  for (const file of files) {
    if (!file.content || (file.kind !== "source" && file.kind !== "test")) continue;
    const astSymbols = extractAstSymbols(file.content);
    for (const sym of astSymbols) {
      symbols.push({
        name: sym.name,
        kind: sym.kind,
        file: file.path,
        exported: sym.exported,
        module: file.module,
      });
    }
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    symbols,
  };
}
