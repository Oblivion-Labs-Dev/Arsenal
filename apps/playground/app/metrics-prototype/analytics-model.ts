import {
  baseComparison,
  baseRarity,
  categoryProfiles,
  rangeSeries,
  technicalPoints,
} from './analytics-data';
import type {
  AnalyticsCategory,
  AnalyticsPoint,
  AnalyticsRange,
  DashboardSnapshot,
  DistributionSegment,
} from './analytics-types';

export const clamp = (value: number, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, value));

export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const calculatePercentage = (value: number, total: number) =>
  total > 0 ? Math.round(clamp((value / total) * 100)) : 0;

export const normalizeDistribution = (segments: DistributionSegment[]) => {
  const total = sum(segments.map((segment) => Math.max(0, segment.value)));
  return segments.map((segment) => ({
    ...segment,
    value: total > 0 ? Math.round((Math.max(0, segment.value) / total) * 100) : 0,
  }));
};

const scaleSeries = (series: AnalyticsPoint[], category: AnalyticsCategory) => {
  if (category === 'all') return series.map((point) => ({ ...point }));
  const profile = categoryProfiles[category];
  return series.map((point) => ({
    ...point,
    planned: Math.max(0, Math.round(point.planned * profile.plannedFactor)),
    completed: Math.max(0, Math.round(point.completed * profile.completedFactor)),
  }));
};

export const buildSnapshotFromSeries = (
  range: AnalyticsRange,
  category: AnalyticsCategory,
  source: AnalyticsPoint[],
): DashboardSnapshot => {
  const series = scaleSeries(source, category);
  const scheduled = sum(series.map((point) => point.planned));
  const completed = sum(series.map((point) => point.completed));
  const remaining = Math.max(0, scheduled - completed);
  const active = Math.min(remaining, Math.round(remaining * 0.56));
  const overdue = Math.min(Math.max(0, remaining - active), Math.round(remaining * 0.22));
  const categoryIndex = ['all', 'focus', 'health', 'career', 'personal'].indexOf(category);
  const comparisonFactor = category === 'all' ? 1 : 0.7 + categoryIndex * 0.08;

  const taskState = normalizeDistribution([
    { id: 'complete', label: 'Complete', value: completed, series: 1 },
    { id: 'active', label: 'Active', value: active, series: 2 },
    { id: 'queued', label: 'Queued', value: Math.max(0, remaining - active - overdue), series: 3 },
    { id: 'overdue', label: 'Overdue', value: overdue, series: 4 },
  ]);
  const rarity = normalizeDistribution(
    baseRarity.map((segment, index) => ({
      ...segment,
      value: Math.max(1, segment.value + (category === 'all' ? 0 : (index - 1) * categoryIndex)),
    })),
  );

  return {
    range,
    category,
    series,
    completionRate: series.map((point) => ({
      id: point.id,
      label: point.label,
      value: clamp(
        calculatePercentage(point.completed, point.planned) + categoryProfiles[category].lineBias,
      ),
    })),
    taskState,
    rarity,
    comparison: baseComparison.map((datum) => ({
      ...datum,
      value: Math.max(0, Math.round(datum.value * comparisonFactor)),
    })),
    technical:
      category === 'all'
        ? technicalPoints.map((point) => ({ ...point }))
        : technicalPoints.filter((point) => point.category === category),
    kpis: [
      { id: 'scheduled', label: 'Scheduled', value: scheduled, change: 8 },
      { id: 'completed', label: 'Completed', value: completed, change: 12 },
      {
        id: 'rate',
        label: 'Completion rate',
        value: calculatePercentage(completed, scheduled),
        unit: '%',
        change: 4,
      },
      { id: 'remaining', label: 'Remaining', value: remaining, change: -6 },
    ],
    empty: series.length === 0 || scheduled === 0,
  };
};

export const buildDashboardSnapshot = (range: AnalyticsRange, category: AnalyticsCategory) =>
  buildSnapshotFromSeries(range, category, rangeSeries[range]);
