import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import type { AutoreviewConfig } from "../config/defaults.js";
import type { ScopedItem } from "../types.js";

function toPosix(path: string): string {
  return path.replace(/\\/g, "/");
}

function componentNameFromPath(path: string): string {
  const base = basename(path).replace(/\.(tsx|jsx|ts|js|vue|svelte)$/, "");
  if (base === "index" || base === "page" || base === "route") {
    return basename(dirname(path));
  }
  return base;
}

/**
 * Map affected components to routes using:
 * 1. Explicit config.routeMappings
 * 2. Next.js/Remix-style filesystem conventions
 * 3. Simple import references in page/route files
 */
export function mapAffectedRoutes(
  affectedComponents: string[],
  cwd: string,
  config: AutoreviewConfig,
  forcedRoutes: string[] = [],
): ScopedItem[] {
  const routes = new Map<string, string>();

  for (const route of forcedRoutes) {
    if (config.scope.ignoredRoutes.includes(route)) continue;
    routes.set(route, "Explicitly requested via --route");
  }

  for (const [route, components] of Object.entries(config.routeMappings)) {
    if (config.scope.ignoredRoutes.includes(route)) continue;
    const hit = affectedComponents.some((c) =>
      components.some((mapped) => toPosix(c).includes(toPosix(mapped)) || toPosix(mapped).includes(toPosix(c))),
    );
    if (hit) {
      routes.set(route, `Configured route mapping matches changed component`);
    }
  }

  // Filesystem route discovery for Next app router / pages
  for (const component of affectedComponents) {
    const posix = toPosix(component);
    const name = componentNameFromPath(posix);

    // If the affected file itself is a route module
    const appRoute = extractAppRouterPath(posix);
    if (appRoute && !config.scope.ignoredRoutes.includes(appRoute)) {
      routes.set(appRoute, `Affected route module ${posix}`);
      continue;
    }
    const pagesRoute = extractPagesRouterPath(posix);
    if (pagesRoute && !config.scope.ignoredRoutes.includes(pagesRoute)) {
      routes.set(pagesRoute, `Affected pages route ${posix}`);
      continue;
    }

    // Find page files that import this component (bounded)
    const pageHits = findPagesImporting(cwd, name, posix);
    for (const hit of pageHits) {
      const route =
        extractAppRouterPath(hit.file) ??
        extractPagesRouterPath(hit.file) ??
        guessRouteFromFile(hit.file);
      if (!route || config.scope.ignoredRoutes.includes(route)) continue;
      routes.set(route, `Route module ${hit.file} imports changed component ${posix}`);
    }
  }

  // Layout containers surrounding matched routes (direct parent only)
  for (const [route, reason] of [...routes.entries()]) {
    const layout = findSurroundingLayout(cwd, route);
    if (layout) {
      routes.set(route, `${reason}; surrounding layout ${layout}`);
    }
  }

  return [...routes.entries()].map(([path, reason]) => ({ path, reason }));
}

export function extractAppRouterPath(file: string): string | null {
  const posix = toPosix(file);
  const match = posix.match(/(?:^|\/)app(\/.*)\/(?:page|layout|route|default|loading|error|not-found)\.[jt]sx?$/);
  if (!match) return null;
  const segments = match[1]
    .split("/")
    .filter(Boolean)
    .filter((s) => !(s.startsWith("(") && s.endsWith(")")))
    .map((s) => s.replace(/^\[+\.?\.?\.?/, ":").replace(/\]+$/, ""));
  return "/" + segments.join("/");
}

export function extractPagesRouterPath(file: string): string | null {
  const posix = toPosix(file);
  const match = posix.match(/(?:^|\/)pages(\/.*)\.[jt]sx?$/);
  if (!match) return null;
  let path = match[1]
    .replace(/\/index$/, "")
    .replace(/\[([^\]]+)\]/g, ":$1");
  if (path === "") path = "/";
  if (!path.startsWith("/")) path = "/" + path;
  if (path.includes("/_")) return null;
  return path === "/index" ? "/" : path;
}

function guessRouteFromFile(file: string): string | null {
  return extractAppRouterPath(file) ?? extractPagesRouterPath(file);
}

function findPagesImporting(
  cwd: string,
  componentName: string,
  componentPath: string,
): Array<{ file: string }> {
  const roots = ["src/app", "app", "src/pages", "pages", "src/routes"];
  const hits: Array<{ file: string }> = [];
  let budget = 200;

  for (const root of roots) {
    const abs = join(cwd, root);
    if (!existsSync(abs)) continue;
    const files: string[] = [];
    walk(abs, files, budget);
    budget -= files.length;
    for (const absFile of files) {
      const rel = toPosix(relative(cwd, absFile));
      try {
        const content = readFileSync(absFile, "utf8");
        if (
          content.includes(componentName) ||
          content.includes(basename(componentPath).replace(/\.[^.]+$/, ""))
        ) {
          hits.push({ file: rel });
        }
      } catch {
        // skip unreadable
      }
    }
  }
  return hits.slice(0, 20);
}

function findSurroundingLayout(cwd: string, route: string): string | null {
  const candidates = [
    join(cwd, "src/app", route === "/" ? "" : route, "layout.tsx"),
    join(cwd, "app", route === "/" ? "" : route, "layout.tsx"),
    join(cwd, "src/app/layout.tsx"),
    join(cwd, "app/layout.tsx"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return toPosix(relative(cwd, candidate));
  }
  return null;
}

function walk(dir: string, out: string[], remaining: number): void {
  if (remaining <= 0) return;
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.length >= remaining) return;
    if (entry === "node_modules" || entry === "dist") continue;
    const abs = join(dir, entry);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(abs, out, remaining);
    else if (/\.(tsx|jsx|ts|js)$/.test(entry)) out.push(abs);
  }
}
