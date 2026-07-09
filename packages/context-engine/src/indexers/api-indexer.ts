export interface ApiEntry {
  method: string;
  path: string;
  file: string;
  handler?: string;
}

export interface ApiIndex {
  version: string;
  generatedAt: string;
  endpoints: ApiEntry[];
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

export function buildApiIndex(files: { path: string; content?: string }[]): ApiIndex {
  const endpoints: ApiEntry[] = [];

  for (const file of files) {
    if (!file.content) continue;
    if (!file.path.includes("api") && !file.path.includes("route.")) continue;

    for (const method of HTTP_METHODS) {
      const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`);
      if (re.test(file.content)) {
        endpoints.push({
          method,
          path: inferApiPath(file.path),
          file: file.path,
          handler: method,
        });
      }
    }

    const expressRe = /\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/gi;
    for (const match of file.content.matchAll(expressRe)) {
      endpoints.push({
        method: (match[1] ?? "get").toUpperCase(),
        path: match[2]!,
        file: file.path,
      });
    }
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    endpoints,
  };
}

function inferApiPath(filePath: string): string {
  const appMatch = filePath.match(/(?:^|\/)app\/(.+)\/route\.[tj]sx?$/);
  if (appMatch) return `/api/${appMatch[1]}`;
  const pagesMatch = filePath.match(/(?:^|\/)pages\/api\/(.+)\.[tj]sx?$/);
  if (pagesMatch) return `/api/${pagesMatch[1]}`;
  return filePath;
}
