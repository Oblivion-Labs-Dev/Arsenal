function fmt(n) {
  return Number(n || 0).toLocaleString("en-US");
}

function pct(n) {
  return `${Number(n || 0).toFixed(1)}%`;
}

async function loadDashboard() {
  const data = await fetchDashboardData();
  render(data);
  const updated = data.generatedAt ?? new Date().toISOString();
  document.getElementById("lastUpdated").textContent = `Updated ${new Date(updated).toLocaleString()}`;
}

async function fetchDashboardData() {
  const embedded = document.getElementById("dashboard-data");
  if (embedded?.textContent?.trim()) {
    return JSON.parse(embedded.textContent);
  }

  const sources = ["./dashboard.json", "/api/dashboard"];
  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* file:// or offline */
    }
  }

  throw new Error("No dashboard data found. Run: arsenal context dashboard");
}

function render(data) {
  const o = data.overview;
  document.getElementById("overview").innerHTML = `
    <h2>Overview</h2>
    <div class="metrics">
      <div class="metric"><div class="label">Tokens Saved</div><div class="value good">${fmt(o.totalTokensSaved)}</div></div>
      <div class="metric"><div class="label">Avg Savings</div><div class="value good">${pct(o.averageSavingsPercent)}</div></div>
      <div class="metric"><div class="label">Context Builds</div><div class="value">${fmt(o.contextBuildsCount)}</div></div>
      <div class="metric"><div class="label">Quality Score</div><div class="value">${o.averageQualityScore}/100</div></div>
      <div class="metric"><div class="label">Stale Files</div><div class="value ${o.staleFilesCount ? "warn" : "good"}">${fmt(o.staleFilesCount)}</div></div>
    </div>`;

  const trends = data.usageTrends;
  const maxSaved = Math.max(...trends.tokensSaved, 1);
  document.getElementById("trendsContent").innerHTML = trends.labels.length
    ? trends.labels.map((label, i) => `
      <div class="bar-row">
        <span>${label.slice(5)}</span>
        <div class="bar"><span style="width:${(trends.tokensSaved[i] / maxSaved) * 100}%"></span></div>
        <span>${fmt(trends.tokensSaved[i])}</span>
      </div>`).join("")
    : "<p class='muted'>No trend data yet. Run context builds to populate.</p>";

  const h = data.hotspots;
  document.getElementById("hotspotsContent").innerHTML = `
    <h3>Most Opened</h3>
    <ul class="list">${listPairs(h.mostOpenedFiles, "file", "count")}</ul>
    <h3>Most Edited</h3>
    <ul class="list">${listPairs(h.mostEditedFiles, "file", "count")}</ul>
    <h3>Stale Modules</h3>
    <ul class="list">${(h.staleModules || []).map((m) => `<li><span>${m}</span></li>`).join("") || "<li>None</li>"}</ul>`;

  const q = data.quality;
  document.getElementById("qualityContent").innerHTML = `
    <div class="score-ring">
      <div class="score-value">${q.score}</div>
      <div><div class="grade">${q.grade}</div><div class="muted">${q.reasons.length} strengths</div></div>
    </div>
    <ul class="list">${q.improvements.map((i) => `<li><span>${i}</span></li>`).join("") || "<li>Looking good</li>"}</ul>`;

  document.getElementById("suggestionsList").innerHTML = data.suggestions.length
    ? data.suggestions.map((s, i) => `<li><strong>${i + 1}.</strong> ${s.message}</li>`).join("")
    : "<li>No suggestions yet — keep building context.</li>";

  document.getElementById("recentTasks").innerHTML = data.recentTasks.length
    ? data.recentTasks.map((t) => `
      <div class="task">
        <h3>${escapeHtml(t.task)}</h3>
        <div class="meta">${t.timestamp.slice(0, 16).replace("T", " ")} · ${fmt(t.estimatedContextTokens)} tokens · saved ${fmt(t.estimatedTokensSaved)} (${pct(t.savingsPercent)})</div>
        <div class="meta">Files: ${t.selectedFiles.slice(0, 4).join(", ")}${t.selectedFiles.length > 4 ? "…" : ""}</div>
      </div>`).join("")
    : "<p>No context builds logged yet.</p>";

  renderDetails(data.details);
}

function renderDetails(details) {
  const el = document.getElementById("detailsContent");
  if (!el) return;
  if (!details) {
    el.innerHTML = "<p class='muted'>No details in snapshot. Re-run <code>arsenal context dashboard</code>.</p>";
    return;
  }

  const p = details.patterns ?? {};
  el.innerHTML = `
    <div class="metrics">
      <div class="metric"><div class="label">Total Builds</div><div class="value">${fmt(p.totalBuilds)}</div></div>
      <div class="metric"><div class="label">Total Events</div><div class="value">${fmt(p.totalEvents)}</div></div>
      <div class="metric"><div class="label">Logged Builds</div><div class="value">${fmt(details.contextBuilds?.length)}</div></div>
      <div class="metric"><div class="label">Agent Events</div><div class="value">${fmt(details.agentEvents?.length)}</div></div>
    </div>
    <h3>Repeated Modules</h3>
    <ul class="list">${listPairs(p.repeatedModules ?? [], "module", "count")}</ul>
    <h3>Heavily Edited Modules</h3>
    <ul class="list">${listPairs(p.heavilyEditedModules ?? [], "module", "edits")}</ul>
    <p class="muted">Full raw logs are in <code>dashboard-details.json</code> and <code>dashboard.json</code>.</p>`;
}

function listPairs(items, key, val) {
  if (!items || !items.length) return "<li>None</li>";
  return items.map((item) => `<li><span>${item[key]}</span><span>${item[val]}</span></li>`).join("");
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
loadDashboard();
