export interface RouteEntry {
  path: string;
  file: string;
  framework: string;
}

export interface RouteIndex {
  version: string;
  generatedAt: string;
  routes: RouteEntry[];
}

const NEXT_PAGE_RE = /(?:^|\/)(?:app|pages)\/(.+?)\/page\.(tsx|ts|jsx|js)$/;
const NEXT_ROUTE_RE = /(?:^|\/)(?:app|pages)\/(.+?)\/route\.(tsx|ts|jsx|js)$/;

export function buildRouteIndex(files: { path: string }[]): RouteIndex {
  const routes: RouteEntry[] = [];

  for (const file of files) {
    const pageMatch = file.path.match(NEXT_PAGE_RE);
    if (pageMatch) {
      const routePath = `/${pageMatch[1]!.replace(/\[(\w+)\]/g, ":$1")}`;
      routes.push({ path: routePath === "/page" ? "/" : routePath.replace(/\/page$/, ""), file: file.path, framework: "nextjs" });
      continue;
    }

    const routeMatch = file.path.match(NEXT_ROUTE_RE);
    if (routeMatch) {
      const routePath = `/api/${routeMatch[1]!.replace(/\[(\w+)\]/g, ":$1")}`;
      routes.push({ path: routePath, file: file.path, framework: "nextjs-api" });
    }
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    routes,
  };
}
