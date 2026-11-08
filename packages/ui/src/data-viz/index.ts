// Data visualisation: dependency-free SVG charts, animated figures and a lazy Lightweight Charts
// wrapper. Pure helpers are exported alongside so apps can test their own data shaping.

export { AnimatedNumber, CountUp } from './animated-number';
export type { AnimatedNumberProps, CountUpProps } from './animated-number';
export { DeltaPill } from './delta-pill';
export type { DeltaPillProps } from './delta-pill';
export { Sparkline } from './sparkline';
export type { SparklineProps, SparklineTone } from './sparkline';
export { ScoreRing } from './score-ring';
export type { ScoreRingProps } from './score-ring';
export { DataRidgeBackground } from './data-ridge-background';
export type { DataRidgeBackgroundProps, DataRidgeSeries } from './data-ridge-background';
export { SemiGauge, DEFAULT_SEMI_GAUGE_BANDS } from './semi-gauge';
export type { SemiGaugeProps, SemiGaugeBandSpec } from './semi-gauge';
export { Treemap, treemapTileColor, treemapLabelLevel, treemapMoveFocus } from './treemap';
export type { TreemapProps, TreemapDirection } from './treemap';
export { DrawdownChart, drawdownChartGeometry } from './drawdown-chart';
export type { DrawdownChartProps } from './drawdown-chart';
export { TimeSeriesChart, resolveChartColor } from './time-series-chart';
export type {
  TimeSeriesChartProps,
  TimeSeriesSpec,
  TimeSeriesTime,
  TimeSeriesValuePoint,
  TimeSeriesCandlePoint,
  TimeSeriesPriceLine,
  TimeSeriesMarker,
} from './time-series-chart';
export { DonutChart, DONUT_PALETTE } from './donut-chart';
export type { DonutChartProps, DonutSegment } from './donut-chart';
export { StackedBarChart } from './stacked-bar-chart';
export type { StackedBarChartProps, StackedBarRow, StackedBarSeries } from './stacked-bar-chart';
export { LineChart } from './line-chart';
export type { LineChartProps, LineChartPoint } from './line-chart';
export { DistributionBars } from './distribution-bars';
export type { DistributionBarsProps, DistributionBucket } from './distribution-bars';
export { ChartDataTable } from './chart-data-table';
export type { ChartDataTableProps, ChartDataCell } from './chart-data-table';

export { useCountUp } from './use-count-up';
export type { CountUpOptions } from './use-count-up';
export { useInViewActive } from './use-in-view-active';

export { easeOutCubic, tweenValue, deltaText, sparkGeometry, ridgePath } from './math';
export type { DeltaText, DeltaKind, DeltaTextOptions, SparkGeometry } from './math';
export {
  semiGaugeGeometry,
  donutArcs,
  lineGeometry,
  stackTotal,
  stackMax,
  distributionShares,
  roundTo,
} from './chart-geometry';
export type {
  SemiGaugeBand,
  SemiGaugeGeometry,
  SemiGaugeFrame,
  DonutArc,
  LinePlotFrame,
  LineGeometry,
  DistributionShare,
} from './chart-geometry';
export { squarify, rectToPercent } from './treemap-layout';
export type { TreemapRect, TreemapItem } from './treemap-layout';
export { toRgba, readChartColors } from './chart-colors';
export { calculateDrawdown } from './drawdown';
export type { EquityPoint, DrawdownPoint, DrawdownSummary } from './drawdown';
