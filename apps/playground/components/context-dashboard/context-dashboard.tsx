"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardCard, GlassCard } from "@arsenal/ui";
import type { DashboardApiResponse } from "@/types/dashboard";
import { FEATURE_AREAS } from "@/lib/feature-catalog";

function fmt(n: number) {
  return Number(n || 0).toLocaleString("en-US");
}

function pct(n: number) {
  return `${Number(n || 0).toFixed(1)}%`;
}

export function ContextDashboard() {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
      setData(json as DashboardApiResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-arsenal-muted">Loading context analytics…</p>;
  }

  if (error || !data) {
    return (
      <GlassCard className="max-w-xl">
        <p className="font-medium text-arsenal-danger">Could not load dashboard</p>
        <p className="mt-2 text-sm text-arsenal-muted">{error ?? "No data"}</p>
        <p className="mt-4 text-sm text-arsenal-secondary">
          Run context indexing from the Arsenal repo root first.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-arsenal border border-arsenal-border px-4 py-2 text-sm hover:border-arsenal-accent"
        >
          Retry
        </button>
      </GlassCard>
    );
  }

  const maxSaved = Math.max(...data.usageTrends.tokensSaved, 1);
  const details = data.details;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-arsenal-muted">
          Updated {new Date(data.generatedAt).toLocaleString()}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-arsenal border border-arsenal-border px-4 py-2 text-sm text-arsenal-secondary hover:border-arsenal-accent hover:text-arsenal-primary"
        >
          Refresh
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardCard
          title="Tokens Saved"
          value={fmt(data.overview.totalTokensSaved)}
          change={`${pct(data.overview.averageSavingsPercent)} avg savings`}
          trend="up"
        />
        <DashboardCard title="Context Builds" value={fmt(data.overview.contextBuildsCount)} />
        <DashboardCard
          title="Quality Score"
          value={`${data.overview.averageQualityScore}/100`}
          change={data.quality.grade}
          trend={data.overview.averageQualityScore >= 75 ? "up" : "neutral"}
        />
        <DashboardCard
          title="Stale Files"
          value={fmt(data.overview.staleFilesCount)}
          trend={data.overview.staleFilesCount > 0 ? "down" : "up"}
        />
        <DashboardCard
          title="Budget Used"
          value={pct(data.savings.averageSavingsPercent)}
          change="inverse of waste"
          trend="up"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-xs font-medium uppercase tracking-wider text-arsenal-muted">
            Usage Trends
          </h2>
          <div className="mt-4 space-y-3">
            {data.usageTrends.labels.length ? (
              data.usageTrends.labels.map((label, i) => (
                <div key={label} className="grid grid-cols-[4rem_1fr_5rem] items-center gap-3 text-sm">
                  <span className="text-arsenal-muted">{label.slice(5)}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-arsenal-elevated">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-600 via-arsenal-accent to-amber-400"
                      style={{ width: `${(data.usageTrends.tokensSaved[i]! / maxSaved) * 100}%` }}
                    />
                  </div>
                  <span className="text-right text-arsenal-secondary">{fmt(data.usageTrends.tokensSaved[i]!)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-arsenal-muted">No trend data yet. Run context builds to populate.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xs font-medium uppercase tracking-wider text-arsenal-muted">
            Context Quality
          </h2>
          <div className="mt-4 flex items-center gap-6">
            <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-arsenal-accent/30 text-3xl font-bold text-arsenal-accent">
              {data.quality.score}
            </div>
            <div>
              <p className="text-lg font-semibold">{data.quality.grade}</p>
              <p className="text-sm text-arsenal-muted">{data.quality.reasons.length} strengths noted</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-arsenal-secondary">
            {data.quality.improvements.length
              ? data.quality.improvements.map((item) => <li key={item}>• {item}</li>)
              : <li>Looking good</li>}
          </ul>
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-xs font-medium uppercase tracking-wider text-arsenal-muted">Hotspots</h2>
          <HotspotList title="Most Opened" items={data.hotspots.mostOpenedFiles} />
          <HotspotList title="Most Edited" items={data.hotspots.mostEditedFiles} />
          <div className="mt-4">
            <p className="text-xs font-medium text-arsenal-muted">Stale Modules</p>
            <ul className="mt-2 space-y-1 text-sm text-arsenal-secondary">
              {data.hotspots.staleModules.length
                ? data.hotspots.staleModules.map((m) => <li key={m}>{m}</li>)
                : <li>None</li>}
            </ul>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xs font-medium uppercase tracking-wider text-arsenal-muted">
            Improvement Suggestions
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-arsenal-secondary">
            {data.suggestions.length
              ? data.suggestions.map((s) => <li key={s.id}>{s.message}</li>)
              : <li>No suggestions yet — keep building context.</li>}
          </ol>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-xs font-medium uppercase tracking-wider text-arsenal-muted">Recent Tasks</h2>
        <div className="mt-4 space-y-4">
          {data.recentTasks.length ? (
            data.recentTasks.map((t) => (
              <div key={t.taskId} className="rounded-arsenal border border-arsenal-border bg-arsenal-elevated/30 p-4">
                <h3 className="font-medium">{t.task}</h3>
                <p className="mt-1 text-sm text-arsenal-muted">
                  {t.timestamp.slice(0, 16).replace("T", " ")} · {fmt(t.estimatedContextTokens)} tokens · saved{" "}
                  {fmt(t.estimatedTokensSaved)} ({pct(t.savingsPercent)})
                </p>
                <p className="mt-1 truncate text-xs text-arsenal-muted">
                  Files: {t.selectedFiles.slice(0, 4).join(", ")}
                  {t.selectedFiles.length > 4 ? "…" : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-arsenal-muted">No context builds logged yet.</p>
          )}
        </div>
      </GlassCard>

      {details && (
        <GlassCard>
          <h2 className="text-xs font-medium uppercase tracking-wider text-arsenal-muted">Details & Patterns</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total Builds" value={details.patterns.totalBuilds} />
            <Stat label="Total Events" value={details.patterns.totalEvents} />
            <Stat label="Logged Builds" value={details.contextBuilds.length} />
            <Stat label="Agent Events" value={details.agentEvents.length} />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <PatternList
              title="Repeated Modules"
              items={details.patterns.repeatedModules.map((m) => ({ name: m.module, count: m.count }))}
            />
            <PatternList
              title="Heavily Edited Modules"
              items={details.patterns.heavilyEditedModules.map((m) => ({ name: m.module, count: m.edits }))}
            />
          </div>
          <p className="mt-4 text-xs text-arsenal-muted">
            Full raw logs: <code className="text-arsenal-secondary">.arsenal/analytics/dashboard.json</code>
          </p>
        </GlassCard>
      )}

      <FeatureLinks />
    </div>
  );
}

function FeatureLinks() {
  return (
    <GlassCard>
      <h2 className="text-xs font-medium uppercase tracking-wider text-arsenal-muted">
        Explore the library
      </h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {FEATURE_AREAS.map((f) => (
          <a
            key={f.id}
            href={`/modules/${f.slug}`}
            className="rounded-arsenal border border-arsenal-border px-4 py-3 text-sm hover:border-arsenal-accent/40"
          >
            <span className="font-medium text-arsenal-primary">{f.title}</span>
            <span className="mt-1 block text-xs text-arsenal-muted">{f.capabilities.length} capabilities</span>
          </a>
        ))}
      </div>
    </GlassCard>
  );
}

function HotspotList({
  title,
  items,
}: {
  title: string;
  items: { file: string; count: number }[];
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-arsenal-muted">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.length
          ? items.map((item) => (
              <li key={item.file} className="flex justify-between gap-2 text-arsenal-secondary">
                <span className="truncate">{item.file}</span>
                <span className="text-arsenal-muted">{item.count}</span>
              </li>
            ))
          : <li className="text-arsenal-muted">None</li>}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-arsenal border border-arsenal-border bg-arsenal-elevated/30 p-4">
      <p className="text-xs text-arsenal-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{fmt(value)}</p>
    </div>
  );
}

function PatternList({
  title,
  items,
}: {
  title: string;
  items: { name: string; count: number }[];
}) {
  return (
    <div>
      <p className="text-xs font-medium text-arsenal-muted">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.length
          ? items.map((item) => (
              <li key={item.name} className="flex justify-between gap-2 text-arsenal-secondary">
                <span className="truncate">{item.name}</span>
                <span className="text-arsenal-muted">{item.count}</span>
              </li>
            ))
          : <li className="text-arsenal-muted">None</li>}
      </ul>
    </div>
  );
}
