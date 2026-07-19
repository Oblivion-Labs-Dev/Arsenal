import type { BrowserEngine, CheckKind, ReviewMode } from "../types.js";

/**
 * Fast mode: Chromium only. Never auto-escalate to Firefox/WebKit.
 * Cross-browser and thorough may include them only when explicitly requested.
 */
export function resolveBrowserEngines(options: {
  mode: ReviewMode;
  checks?: CheckKind[];
}): BrowserEngine[] {
  const checks = new Set(options.checks ?? []);
  const cross = checks.has("cross-browser");
  if (cross) return ["chromium", "firefox", "webkit"];
  if (options.mode === "thorough") return ["chromium", "firefox", "webkit"];
  return ["chromium"];
}

export function shouldRunMobileViewport(options: {
  mode: ReviewMode;
  checks?: CheckKind[];
  responsiveUiChanged: boolean;
}): boolean {
  if (options.checks?.includes("responsive")) return true;
  if (options.mode === "thorough") return true;
  return options.responsiveUiChanged;
}

export function isResponsiveUiChange(files: string[]): boolean {
  return files.some((f) =>
    /(sm:|md:|lg:|xl:|@media|responsive|mobile|viewport)/i.test(f) ||
    /\.(css|scss)$/.test(f),
  );
}
