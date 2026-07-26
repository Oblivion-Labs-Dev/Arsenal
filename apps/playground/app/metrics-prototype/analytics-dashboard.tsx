'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { buildDashboardSnapshot } from './analytics-model';
import type { AnalyticsCategory, AnalyticsRange, DashboardSelection } from './analytics-types';
import { useDashboardStore } from './use-dashboard-store';
import {
  CapsuleSliders,
  CategoryControls,
  DashboardDataTables,
  DimensionalBarChart,
  DimensionalLineChart,
  GeometricComparisonChart,
  KpiTiles,
  SegmentedDonutChart,
  TechnicalGrid,
} from './dashboard-charts';
import styles from './analytics-dashboard.module.css';

const ranges: { value: AnalyticsRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const validRange = (value: string | null): value is AnalyticsRange =>
  ranges.some((range) => range.value === value);
const validCategory = (value: string | null): value is AnalyticsCategory =>
  ['all', 'focus', 'health', 'career', 'personal'].includes(value ?? '');

export function AnalyticsDashboard() {
  const [state, dispatch] = useDashboardStore();
  const [shareStatus, setShareStatus] = useState('');
  const reduceMotion = useReducedMotion();
  const snapshot = useMemo(
    () => buildDashboardSnapshot(state.range, state.category),
    [state.range, state.category],
  );
  const select = (value: DashboardSelection) => dispatch({ type: 'select', value });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const range = params.get('range');
    const category = params.get('category');
    if (validRange(range)) dispatch({ type: 'set-range', value: range });
    if (validCategory(category)) dispatch({ type: 'set-category', value: category });
  }, [dispatch]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('range', state.range);
    url.searchParams.set('category', state.category);
    window.history.replaceState({}, '', url);
  }, [state.range, state.category]);

  const share = async () => {
    const shareNavigator = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    const canShare = typeof shareNavigator.share === 'function';
    const payload = {
      title: 'Arsenal Metrics Lab',
      text: 'Explore this task performance view.',
      url: window.location.href,
    };
    try {
      if (canShare) await shareNavigator.share?.(payload);
      else await navigator.clipboard.writeText(window.location.href);
      setShareStatus(canShare ? 'Shared' : 'Link copied');
    } catch {
      setShareStatus('Share cancelled');
    }
    window.setTimeout(() => setShareStatus(''), 1800);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen?.();
  };

  return (
    <main
      className={styles.dashboard}
      data-quality={state.quality}
      data-reduced-motion={reduceMotion ? 'true' : 'false'}
      data-theme={state.theme}
      data-view={state.view}
    >
      <a className={styles.skipLink} href="#metrics-content">
        Skip to metrics
      </a>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <span className={styles.brandMark} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <strong>ARSENAL</strong>
            <span>Metrics Lab / Performance</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.rangeSwitch} aria-label="Date range">
            {ranges.map((range) => (
              <button
                aria-pressed={state.range === range.value}
                key={range.value}
                onClick={() => dispatch({ type: 'set-range', value: range.value })}
                type="button"
              >
                {range.label}
              </button>
            ))}
          </div>
          <button
            className={styles.iconButton}
            onClick={share}
            type="button"
            aria-label="Share dashboard"
          >
            ↗ <span>Share</span>
          </button>
          <button
            className={styles.iconButton}
            onClick={() =>
              dispatch({ type: 'set-theme', value: state.theme === 'dark' ? 'light' : 'dark' })
            }
            type="button"
            aria-label={`Use ${state.theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {state.theme === 'dark' ? '☼' : '◐'}
          </button>
          <details className={styles.settingsMenu}>
            <summary aria-label="Dashboard settings">⌘</summary>
            <div>
              <span>Display controls</span>
              <button
                onClick={() =>
                  dispatch({ type: 'set-view', value: state.view === '3d' ? '2d' : '3d' })
                }
                type="button"
              >
                <i aria-hidden="true" />
                {state.view === '3d' ? 'Use flat 2D view' : 'Use dimensional view'}
              </button>
              <button
                onClick={() =>
                  dispatch({
                    type: 'set-quality',
                    value: state.quality === 'high' ? 'low' : 'high',
                  })
                }
                type="button"
              >
                <i aria-hidden="true" />
                {state.quality === 'high' ? 'Use low graphics' : 'Use high graphics'}
              </button>
              <button onClick={() => dispatch({ type: 'toggle-tables' })} type="button">
                <i aria-hidden="true" />
                {state.showTables ? 'Hide data tables' : 'Show data tables'}
              </button>
            </div>
          </details>
          <button
            className={styles.iconButton}
            onClick={toggleFullscreen}
            type="button"
            aria-label="Toggle fullscreen"
          >
            ⛶
          </button>
        </div>
      </header>

      <div aria-live="polite" className={styles.toast}>
        {shareStatus}
      </div>

      <section className={styles.hero} id="metrics-content">
        <div>
          <span className={styles.eyebrow}>WORKSPACE / ORCHESTRATOR</span>
          <h1>Performance, with depth.</h1>
          <p>
            A tactile view of task output, energy, and momentum. Every control updates the same live
            dataset.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <span>LIVE SIGNAL</span>
          <strong>{snapshot.kpis[2]?.value ?? 0}%</strong>
          <small>completion rate</small>
        </div>
      </section>

      <CategoryControls
        value={state.category}
        onChange={(value) => dispatch({ type: 'set-category', value })}
      />
      <KpiTiles kpis={snapshot.kpis} onSelect={select} />

      <section
        className={styles.platformShell}
        aria-label="Interactive analytics platform"
        onClick={() => dispatch({ type: 'clear-selection' })}
      >
        <div className={styles.platformTop} aria-hidden="true">
          <span>01 / LIVE FIELD</span>
          <span>SELECT ANY DATA OBJECT</span>
        </div>
        {snapshot.empty ? (
          <div className={styles.emptyState}>
            <strong>No activity yet</strong>
            <p>Choose another range or reset the dashboard to restore the sample data.</p>
            <button
              onClick={(event) => {
                event.stopPropagation();
                dispatch({ type: 'reset' });
              }}
              type="button"
            >
              Reset dashboard
            </button>
          </div>
        ) : (
          <div className={styles.chartGrid}>
            <CapsuleSliders
              values={state.energy}
              onChange={(metric, value) => dispatch({ type: 'set-energy', metric, value })}
            />
            <DimensionalBarChart data={snapshot.series} onSelect={select} />
            <DimensionalLineChart data={snapshot.completionRate} onSelect={select} />
            <SegmentedDonutChart
              eyebrow="STATUS"
              title="Task state"
              data={snapshot.taskState}
              chart="task-state"
              onSelect={select}
            />
            <SegmentedDonutChart
              eyebrow="VALUE"
              title="Rarity mix"
              data={snapshot.rarity}
              chart="rarity"
              onSelect={select}
            />
            <GeometricComparisonChart data={snapshot.comparison} onSelect={select} />
            <TechnicalGrid data={snapshot.technical} onSelect={select} />
          </div>
        )}
        <AnimatePresence>
          {state.selection ? (
            <motion.aside
              animate={{ opacity: 1, y: 0 }}
              className={styles.selectionPanel}
              exit={{ opacity: 0, y: 8 }}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              onClick={(event) => event.stopPropagation()}
              role="status"
            >
              <span>SELECTED / {state.selection.chart.replace('-', ' ')}</span>
              <strong>{state.selection.label}</strong>
              <b>{state.selection.value}</b>
              <button
                aria-label="Clear selection"
                onClick={() => dispatch({ type: 'clear-selection' })}
                type="button"
              >
                ×
              </button>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </section>

      {state.showTables ? <DashboardDataTables snapshot={snapshot} /> : null}

      <footer className={styles.footerBar}>
        <span>ARSENAL / ANALYTICS SYSTEM 01</span>
        <div>
          <button onClick={() => dispatch({ type: 'toggle-tables' })} type="button">
            {state.showTables ? 'Hide tables' : 'View data tables'}
          </button>
          <button onClick={() => dispatch({ type: 'reset' })} type="button">
            Reset controls
          </button>
        </div>
      </footer>
    </main>
  );
}
