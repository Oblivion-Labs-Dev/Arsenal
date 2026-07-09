import type { IncomingMessage, ServerResponse } from "http";
import type { DashboardData } from "../analytics/analytics-types.js";
import { AnalyticsStore } from "../analytics/analytics-store.js";
import { sendJson, serveFile } from "./dashboard-routes.js";

export type DashboardHandler = (req: IncomingMessage, res: ServerResponse) => void;

export function createDashboardRoutes(
  getData: () => DashboardData,
  uiDir: string,
  repoRoot?: string,
): Map<string, DashboardHandler> {
  const routes = new Map<string, DashboardHandler>();

  routes.set("GET /api/dashboard", (_req, res) => {
    if (repoRoot) {
      const snapshot = new AnalyticsStore(repoRoot).readDashboardSnapshot();
      if (snapshot) {
        sendJson(res, snapshot);
        return;
      }
    }
    sendJson(res, getData());
  });

  routes.set("GET /api/dashboard/details", (_req, res) => {
    if (!repoRoot) {
      sendJson(res, { error: "No repo root" });
      return;
    }
    const snapshot = new AnalyticsStore(repoRoot).readDashboardSnapshot();
    sendJson(res, snapshot?.details ?? {});
  });

  routes.set("GET /api/health", (_req, res) => {
    sendJson(res, { ok: true, timestamp: new Date().toISOString() });
  });

  routes.set("GET /", (_req, res) => {
    serveFile(res, `${uiDir}/index.html`, "text/html");
  });

  routes.set("GET /styles.css", (_req, res) => {
    serveFile(res, `${uiDir}/styles.css`, "text/css");
  });

  routes.set("GET /app.js", (_req, res) => {
    serveFile(res, `${uiDir}/app.js`, "application/javascript");
  });

  return routes;
}

export function matchRoute(method: string, url: string): string {
  const path = url.split("?")[0] ?? "/";
  return `${method} ${path}`;
}
