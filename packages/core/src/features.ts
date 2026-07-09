import type { ArsenalFeatureFlags } from "./types.js";
import { DEFAULT_FEATURE_FLAGS } from "./types.js";

let flags: ArsenalFeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

export function getFeatureFlags(): ArsenalFeatureFlags {
  return { ...flags };
}

export function setFeatureFlags(partial: Partial<ArsenalFeatureFlags>): ArsenalFeatureFlags {
  flags = { ...flags, ...partial };
  return getFeatureFlags();
}

export function isFeatureEnabled(key: keyof ArsenalFeatureFlags): boolean {
  return flags[key];
}

export function resetFeatureFlags(): void {
  flags = { ...DEFAULT_FEATURE_FLAGS };
}
