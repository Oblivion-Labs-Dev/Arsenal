import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { AnalyticsStore, analyticsPath } from "../analytics/analytics-store.js";
import { detectPatterns } from "../analytics/pattern-detector.js";
import type { DashboardData, DashboardSnapshot } from "../analytics/analytics-types.js";
import { writeJsonFile } from "../core/file-io.js";
import { getDashboardUiPath } from "./dashboard-server.js";

export interface SaveDashboardResult {
  jsonPath: string;
  viewerPath: string;
  snapshot: DashboardSnapshot;
}

export function buildDashboardSnapshot(
  repoRoot: string,
  data: DashboardData,
): DashboardSnapshot {
  const store = new AnalyticsStore(repoRoot);
  const builds = store.readContextBuilds();
  const events = store.readAgentEvents();
  const usageLog = store.readUsageLog();

  return {
    generatedAt: new Date().toISOString(),
    ...data,
    details: {
      contextBuilds: builds,
      agentEvents: events,
      usageLog,
      patterns: detectPatterns(builds, events),
    },
  };
}

export function saveDashboardSnapshot(
  repoRoot: string,
  data: DashboardData,
): SaveDashboardResult {
  const snapshot = buildDashboardSnapshot(repoRoot, data);
  const store = new AnalyticsStore(repoRoot);
  store.writeDashboardSnapshot(snapshot);

  const jsonPath = analyticsPath(repoRoot, "dashboard.json");
  const viewerPath = writeDashboardViewer(repoRoot, snapshot);

  return { jsonPath, viewerPath, snapshot };
}

function writeDashboardViewer(repoRoot: string, snapshot: DashboardSnapshot): string {
  const outDir = analyticsPath(repoRoot);
  mkdirSync(outDir, { recursive: true });

  const uiDir = getDashboardUiPath();
  const stylesSrc = join(uiDir, "styles.css");
  const appSrc = join(uiDir, "app.js");

  const styles = existsSync(stylesSrc) ? readFileSync(stylesSrc, "utf-8") : "";
  const appJs = existsSync(appSrc) ? readFileSync(appSrc, "utf-8") : "";
  const json = JSON.stringify(snapshot).replace(/</g, "\\u003c");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Arsenal Context Intelligence</title>
  <style>${styles}</style>
</head>
<body>
  <header class="header">
    <div class="brand">
      <span class="brand-mark">A</span>
      <div>
        <h1>Arsenal Context Intelligence</h1>
        <p class="subtitle">Token savings, quality, and learning loop</p>
      </div>
    </div>
    <button id="refreshBtn" class="btn">Reload</button>
  </header>

  <main class="grid">
    <section class="card overview" id="overview"></section>
    <section class="card" id="trends">
      <h2>Usage Trends</h2>
      <div id="trendsContent" class="trends"></div>
    </section>
    <section class="card" id="hotspots">
      <h2>Hotspots</h2>
      <div id="hotspotsContent"></div>
    </section>
    <section class="card" id="quality">
      <h2>Context Quality</h2>
      <div id="qualityContent"></div>
    </section>
    <section class="card wide" id="suggestions">
      <h2>Improvement Suggestions</h2>
      <ul id="suggestionsList" class="suggestions"></ul>
    </section>
    <section class="card wide" id="autoreviewPanel"></section>
    <section class="card wide" id="recent">
      <h2>Recent Tasks</h2>
      <div id="recentTasks"></div>
    </section>
    <section class="card wide" id="details">
      <h2>Details</h2>
      <div id="detailsContent" class="muted">Loading…</div>
    </section>
  </main>

  <footer class="footer">
    <span>Arsenal Context Engine</span>
    <span id="lastUpdated"></span>
  </footer>

  <script type="application/json" id="dashboard-data">${json}</script>
  <script>${appJs}</script>
</body>
</html>`;

  const viewerPath = analyticsPath(repoRoot, "dashboard.html");
  writeFileSync(viewerPath, html, "utf-8");

  // Standalone JSON for tooling / editors
  writeJsonFile(analyticsPath(repoRoot, "dashboard-details.json"), snapshot.details);

  // Copy assets for optional local file browsing (fetch may be blocked on file://)
  if (existsSync(stylesSrc)) {
    copyFileSync(stylesSrc, join(outDir, "dashboard-styles.css"));
  }
  if (existsSync(appSrc)) {
    copyFileSync(appSrc, join(outDir, "dashboard-app.js"));
  }

  return viewerPath;
}
