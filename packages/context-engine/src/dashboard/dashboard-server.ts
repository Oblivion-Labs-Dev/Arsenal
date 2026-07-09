import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { aggregateDashboardData } from "./dashboard-data.js";
import { createDashboardRoutes, matchRoute } from "./dashboard-handlers.js";

export const DEFAULT_DASHBOARD_PORT = 3987;

export interface DashboardServerOptions {
  repoRoot: string;
  port?: number;
  host?: string;
}

export function startDashboardServer(options: DashboardServerOptions): Promise<{ port: number; url: string }> {
  const port = options.port ?? DEFAULT_DASHBOARD_PORT;
  const host = options.host ?? "localhost";
  const uiDir = resolveUiDir();

  const getData = () => aggregateDashboardData(options.repoRoot);
  const routes = createDashboardRoutes(getData, uiDir, options.repoRoot);

  const server = createServer((req, res) => {
    const method = req.method ?? "GET";
    const routeKey = matchRoute(method, req.url ?? "/");
    const handler = routes.get(routeKey);
    if (handler) {
      handler(req, res);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => {
      resolve({ port, url: `http://${host}:${port}` });
    });
  });
}

function resolveUiDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, "dashboard-ui"),
    join(here, "dashboard", "dashboard-ui"),
    join(dirname(here), "dashboard", "dashboard-ui"),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "index.html"))) return dir;
  }
  return join(here, "dashboard-ui");
}

export function getDashboardUiPath(): string {
  return resolveUiDir();
}
