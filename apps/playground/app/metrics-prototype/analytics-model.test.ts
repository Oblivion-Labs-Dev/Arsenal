import { describe, expect, it } from 'vitest';
import {
  buildDashboardSnapshot,
  buildSnapshotFromSeries,
  calculatePercentage,
  normalizeDistribution,
} from './analytics-model';

describe('metrics analytics model', () => {
  it('aggregates the weekly KPI values from the visible series', () => {
    const snapshot = buildDashboardSnapshot('week', 'all');
    const scheduled = snapshot.series.reduce((total, point) => total + point.planned, 0);
    const completed = snapshot.series.reduce((total, point) => total + point.completed, 0);

    expect(snapshot.kpis.find((kpi) => kpi.id === 'scheduled')?.value).toBe(scheduled);
    expect(snapshot.kpis.find((kpi) => kpi.id === 'completed')?.value).toBe(completed);
    expect(snapshot.kpis.find((kpi) => kpi.id === 'rate')?.value).toBe(
      calculatePercentage(completed, scheduled),
    );
  });

  it('scales the same range when a category is selected', () => {
    const all = buildDashboardSnapshot('month', 'all');
    const focus = buildDashboardSnapshot('month', 'focus');

    expect(focus.kpis[0].value).toBeLessThan(all.kpis[0].value);
    expect(focus.technical.every((point) => point.category === 'focus')).toBe(true);
  });

  it('normalizes donut distributions and safely handles zero totals', () => {
    expect(
      normalizeDistribution([
        { id: 'one', label: 'One', value: 1, series: 1 },
        { id: 'three', label: 'Three', value: 3, series: 2 },
      ]).map((segment) => segment.value),
    ).toEqual([25, 75]);
    expect(calculatePercentage(4, 0)).toBe(0);
  });

  it('produces a stable empty state for missing activity', () => {
    const snapshot = buildSnapshotFromSeries('today', 'all', []);

    expect(snapshot.empty).toBe(true);
    expect(snapshot.kpis.map((kpi) => kpi.value)).toEqual([0, 0, 0, 0]);
    expect(snapshot.completionRate).toEqual([]);
  });
});
