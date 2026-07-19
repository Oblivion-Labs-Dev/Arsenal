import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import YAML from "yaml";
import { DEFAULT_CONFIG, type AutoreviewConfig } from "./defaults.js";

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof result[key as keyof T] === "object" &&
      result[key as keyof T] !== null &&
      !Array.isArray(result[key as keyof T])
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        result[key as keyof T] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export async function loadConfig(
  cwd: string,
  configPath?: string,
): Promise<AutoreviewConfig> {
  const candidates = configPath
    ? [resolve(cwd, configPath)]
    : [
        join(cwd, "autoreview.config.ts"),
        join(cwd, "autoreview.config.js"),
        join(cwd, "autoreview.config.mjs"),
        join(cwd, "autoreview.config.json"),
      ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;

    if (candidate.endsWith(".json")) {
      const raw = JSON.parse(readFileSync(candidate, "utf8")) as Partial<AutoreviewConfig>;
      return deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, raw as Record<string, unknown>) as unknown as AutoreviewConfig;
    }

    try {
      const mod = await import(pathToFileURL(candidate).href);
      const raw = (mod.default ?? mod.config ?? mod) as Partial<AutoreviewConfig>;
      return deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, raw as Record<string, unknown>) as unknown as AutoreviewConfig;
    } catch {
      // Config may be TS without a loader; fall through to JSON/YAML companions.
    }
  }

  const yamlGates = join(cwd, "quality-gates.yml");
  if (existsSync(yamlGates)) {
    const gates = YAML.parse(readFileSync(yamlGates, "utf8")) as {
      qualityGates?: Partial<AutoreviewConfig["qualityGates"]>;
    };
    if (gates.qualityGates) {
      return {
        ...DEFAULT_CONFIG,
        qualityGates: { ...DEFAULT_CONFIG.qualityGates, ...gates.qualityGates },
      };
    }
  }

  return { ...DEFAULT_CONFIG };
}

export * from "./defaults.js";
