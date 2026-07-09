import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function writeJsonFile(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function readTextFile(path: string, fallback = ""): string {
  if (!existsSync(path)) return fallback;
  return readFileSync(path, "utf-8");
}

export function writeTextFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
}

export function appendTextFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";
  writeFileSync(path, existing + content, "utf-8");
}

export function appendJsonl<T>(path: string, entry: T): void {
  mkdirSync(dirname(path), { recursive: true });
  const line = JSON.stringify(entry) + "\n";
  const existing = existsSync(path) ? readFileSync(path, "utf-8") : "";
  writeFileSync(path, existing + line, "utf-8");
}

export function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}
