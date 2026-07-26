import type {
  AnalyticsCategory,
  AnalyticsPoint,
  AnalyticsRange,
  ComparisonDatum,
  DistributionSegment,
  EnergyValues,
  TechnicalPoint,
} from './analytics-types';

export const rangeSeries: Record<AnalyticsRange, AnalyticsPoint[]> = {
  today: [
    { id: '06', label: '6 AM', planned: 2, completed: 1 },
    { id: '09', label: '9 AM', planned: 4, completed: 4 },
    { id: '12', label: '12 PM', planned: 5, completed: 3 },
    { id: '15', label: '3 PM', planned: 6, completed: 4 },
    { id: '18', label: '6 PM', planned: 4, completed: 2 },
    { id: '21', label: '9 PM', planned: 3, completed: 1 },
    { id: '24', label: '12 AM', planned: 1, completed: 0 },
  ],
  week: [
    { id: 'mon', label: 'Mon', planned: 12, completed: 10 },
    { id: 'tue', label: 'Tue', planned: 15, completed: 12 },
    { id: 'wed', label: 'Wed', planned: 11, completed: 9 },
    { id: 'thu', label: 'Thu', planned: 17, completed: 14 },
    { id: 'fri', label: 'Fri', planned: 14, completed: 11 },
    { id: 'sat', label: 'Sat', planned: 8, completed: 7 },
    { id: 'sun', label: 'Sun', planned: 9, completed: 6 },
  ],
  month: [
    { id: 'w1', label: 'Week 1', planned: 46, completed: 39 },
    { id: 'w2', label: 'Week 2', planned: 52, completed: 44 },
    { id: 'w3', label: 'Week 3', planned: 49, completed: 43 },
    { id: 'w4', label: 'Week 4', planned: 58, completed: 51 },
    { id: 'w5', label: 'Week 5', planned: 31, completed: 24 },
    { id: 'review', label: 'Review', planned: 18, completed: 16 },
    { id: 'carry', label: 'Carry', planned: 12, completed: 8 },
  ],
};

export const categoryProfiles: Record<
  AnalyticsCategory,
  {
    label: string;
    plannedFactor: number;
    completedFactor: number;
    lineBias: number;
  }
> = {
  all: { label: 'All work', plannedFactor: 1, completedFactor: 1, lineBias: 0 },
  focus: { label: 'Focus', plannedFactor: 0.42, completedFactor: 0.46, lineBias: 5 },
  health: { label: 'Health', plannedFactor: 0.2, completedFactor: 0.22, lineBias: 2 },
  career: { label: 'Career', plannedFactor: 0.25, completedFactor: 0.23, lineBias: -3 },
  personal: { label: 'Personal', plannedFactor: 0.18, completedFactor: 0.17, lineBias: -5 },
};

export const defaultEnergy: EnergyValues = {
  mental: 68,
  physical: 52,
  focus: 76,
};

export const baseRarity: DistributionSegment[] = [
  { id: 'common', label: 'Common', value: 42, series: 1 },
  { id: 'rare', label: 'Rare', value: 31, series: 2 },
  { id: 'epic', label: 'Epic', value: 19, series: 3 },
  { id: 'legendary', label: 'Legendary', value: 8, series: 4 },
];

export const baseComparison: ComparisonDatum[] = [
  { id: 'quick', label: 'Quick task', value: 18, shape: 'cube' },
  { id: 'medium', label: 'Medium task', value: 31, shape: 'prism' },
  { id: 'deep', label: 'Deep task', value: 46, shape: 'pyramid' },
  { id: 'milestone', label: 'Milestone', value: 62, shape: 'crystal' },
];

export const technicalPoints: TechnicalPoint[] = [
  {
    id: 'deep-plan',
    label: 'Architecture plan',
    mental: 84,
    physical: 12,
    time: 78,
    category: 'focus',
  },
  { id: 'walk', label: 'Recovery walk', mental: 18, physical: 72, time: 30, category: 'health' },
  {
    id: 'portfolio',
    label: 'Portfolio review',
    mental: 66,
    physical: 8,
    time: 52,
    category: 'career',
  },
  { id: 'meal', label: 'Prepare dinner', mental: 28, physical: 44, time: 38, category: 'personal' },
  {
    id: 'research',
    label: 'Research block',
    mental: 76,
    physical: 10,
    time: 64,
    category: 'focus',
  },
  {
    id: 'strength',
    label: 'Strength session',
    mental: 24,
    physical: 88,
    time: 58,
    category: 'health',
  },
  {
    id: 'outreach',
    label: 'Career outreach',
    mental: 56,
    physical: 6,
    time: 34,
    category: 'career',
  },
  {
    id: 'admin',
    label: 'Personal admin',
    mental: 42,
    physical: 12,
    time: 26,
    category: 'personal',
  },
];
