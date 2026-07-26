export type AnalyticsRange = 'today' | 'week' | 'month';
export type AnalyticsCategory = 'all' | 'focus' | 'health' | 'career' | 'personal';
export type EnergyMetric = 'mental' | 'physical' | 'focus';
export type DashboardTheme = 'dark' | 'light';
export type DashboardQuality = 'high' | 'low';
export type DashboardView = '3d' | '2d';

export interface AnalyticsPoint {
  id: string;
  label: string;
  planned: number;
  completed: number;
}

export interface RatePoint {
  id: string;
  label: string;
  value: number;
}

export interface DistributionSegment {
  id: string;
  label: string;
  value: number;
  series: 1 | 2 | 3 | 4;
}

export interface ComparisonDatum {
  id: 'quick' | 'medium' | 'deep' | 'milestone';
  label: string;
  value: number;
  shape: 'cube' | 'prism' | 'pyramid' | 'crystal';
}

export interface TechnicalPoint {
  id: string;
  label: string;
  mental: number;
  physical: number;
  time: number;
  category: Exclude<AnalyticsCategory, 'all'>;
}

export interface DashboardKpi {
  id: 'scheduled' | 'completed' | 'rate' | 'remaining';
  label: string;
  value: number;
  unit?: string;
  change: number;
}

export interface EnergyValues {
  mental: number;
  physical: number;
  focus: number;
}

export interface DashboardSnapshot {
  range: AnalyticsRange;
  category: AnalyticsCategory;
  series: AnalyticsPoint[];
  completionRate: RatePoint[];
  taskState: DistributionSegment[];
  rarity: DistributionSegment[];
  comparison: ComparisonDatum[];
  technical: TechnicalPoint[];
  kpis: DashboardKpi[];
  empty: boolean;
}

export interface DashboardSelection {
  chart: 'kpi' | 'bar' | 'line' | 'task-state' | 'rarity' | 'comparison' | 'technical';
  id: string;
  label: string;
  value: string;
}

export interface DashboardState {
  range: AnalyticsRange;
  category: AnalyticsCategory;
  energy: EnergyValues;
  selection: DashboardSelection | null;
  view: DashboardView;
  theme: DashboardTheme;
  quality: DashboardQuality;
  showTables: boolean;
}
