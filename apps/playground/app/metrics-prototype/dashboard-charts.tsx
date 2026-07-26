'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { categoryProfiles } from './analytics-data';
import type {
  AnalyticsCategory,
  AnalyticsPoint,
  ComparisonDatum,
  DashboardKpi,
  DashboardSelection,
  DashboardSnapshot,
  DistributionSegment,
  EnergyMetric,
  EnergyValues,
  RatePoint,
  TechnicalPoint,
} from './analytics-types';
import styles from './analytics-dashboard.module.css';

type SelectHandler = (selection: DashboardSelection) => void;
type VariableStyle = CSSProperties & Record<`--${string}`, string | number>;

const chartMotion = (reduceMotion: boolean | null, delay = 0) => ({
  initial: reduceMotion ? false : { opacity: 0, y: 12, rotateX: -4 },
  animate: { opacity: 1, y: 0, rotateX: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function KpiTiles({ kpis, onSelect }: { kpis: DashboardKpi[]; onSelect: SelectHandler }) {
  const reduceMotion = useReducedMotion();
  return (
    <section className={styles.kpiGrid} aria-label="Performance summary">
      {kpis.map((kpi, index) => (
        <motion.button
          {...chartMotion(reduceMotion, index * 0.05)}
          className={styles.kpiTile}
          key={kpi.id}
          onClick={(event) => {
            event.stopPropagation();
            onSelect({
              chart: 'kpi',
              id: kpi.id,
              label: kpi.label,
              value: `${kpi.value}${kpi.unit ?? ''}`,
            });
          }}
          type="button"
        >
          <span className={styles.kpiLabel}>{kpi.label}</span>
          <strong>
            {kpi.value}
            {kpi.unit}
          </strong>
          <span className={kpi.change >= 0 ? styles.positiveChange : styles.negativeChange}>
            {kpi.change >= 0 ? '↗' : '↘'} {Math.abs(kpi.change)}%
          </span>
        </motion.button>
      ))}
    </section>
  );
}

export function CapsuleSliders({
  values,
  onChange,
}: {
  values: EnergyValues;
  onChange: (metric: EnergyMetric, value: number) => void;
}) {
  const labels: Record<EnergyMetric, string> = {
    mental: 'Mental',
    physical: 'Physical',
    focus: 'Focus',
  };
  return (
    <section className={`${styles.module} ${styles.energyModule}`} aria-labelledby="energy-title">
      <ModuleHeader eyebrow="LIVE INPUT" title="Energy balance" id="energy-title" />
      <div className={styles.sliderBank}>
        {(Object.keys(labels) as EnergyMetric[]).map((metric, index) => (
          <label
            className={styles.capsuleControl}
            key={metric}
            style={{ '--series-index': index + 1 } as VariableStyle}
          >
            <span>{labels[metric]}</span>
            <output htmlFor={`energy-${metric}`}>{values[metric]}</output>
            <input
              aria-label={`${labels[metric]} energy`}
              id={`energy-${metric}`}
              max="100"
              min="0"
              onChange={(event) => onChange(metric, Number(event.currentTarget.value))}
              onClick={(event) => event.stopPropagation()}
              style={{ '--value': `${values[metric]}%` } as VariableStyle}
              type="range"
              value={values[metric]}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function ModuleHeader({
  eyebrow,
  title,
  id,
  meta,
}: {
  eyebrow: string;
  title: string;
  id: string;
  meta?: string;
}) {
  return (
    <header className={styles.moduleHeader}>
      <span>{eyebrow}</span>
      <div>
        <h2 id={id}>{title}</h2>
        {meta ? <small>{meta}</small> : null}
      </div>
    </header>
  );
}

export function DimensionalBarChart({
  data,
  onSelect,
}: {
  data: AnalyticsPoint[];
  onSelect: SelectHandler;
}) {
  const reduceMotion = useReducedMotion();
  const maximum = Math.max(1, ...data.flatMap((point) => [point.planned, point.completed]));
  return (
    <motion.section
      {...chartMotion(reduceMotion, 0.12)}
      className={`${styles.module} ${styles.barModule}`}
      aria-labelledby="bar-title"
    >
      <ModuleHeader eyebrow="OUTPUT" title="Planned vs completed" id="bar-title" meta="Tasks" />
      <div className={styles.barChart} role="group" aria-label="Planned and completed task bars">
        {data.map((point) => (
          <div className={styles.barGroup} key={point.id}>
            <div className={styles.barStage}>
              {(['planned', 'completed'] as const).map((kind, seriesIndex) => {
                const value = point[kind];
                return (
                  <button
                    aria-label={`${point.label}, ${kind}, ${value} tasks`}
                    className={`${styles.bar} ${kind === 'completed' ? styles.completedBar : ''}`}
                    key={kind}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect({
                        chart: 'bar',
                        id: `${point.id}-${kind}`,
                        label: `${point.label} · ${kind}`,
                        value: `${value} tasks`,
                      });
                    }}
                    style={
                      {
                        '--height': `${Math.max(5, (value / maximum) * 100)}%`,
                        '--series-index': seriesIndex + 1,
                      } as VariableStyle
                    }
                    type="button"
                  >
                    <span className={styles.tooltip}>{value}</span>
                  </button>
                );
              })}
            </div>
            <span className={styles.axisLabel}>{point.label}</span>
          </div>
        ))}
      </div>
      <div className={styles.legend} aria-label="Bar chart legend">
        <span>
          <i className={styles.swatchOne} />
          Planned
        </span>
        <span>
          <i className={styles.swatchTwo} />
          Completed
        </span>
      </div>
    </motion.section>
  );
}

export function DimensionalLineChart({
  data,
  onSelect,
}: {
  data: RatePoint[];
  onSelect: SelectHandler;
}) {
  const reduceMotion = useReducedMotion();
  const width = 600;
  const height = 210;
  const coordinates = data.map((point, index) => ({
    ...point,
    x: data.length > 1 ? 28 + (index / (data.length - 1)) * (width - 56) : width / 2,
    y: height - 24 - (point.value / 100) * (height - 48),
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `28,${height - 24} ${line} ${width - 28},${height - 24}`;
  return (
    <motion.section
      {...chartMotion(reduceMotion, 0.18)}
      className={`${styles.module} ${styles.lineModule}`}
      aria-labelledby="line-title"
    >
      <ModuleHeader eyebrow="VELOCITY" title="Completion rhythm" id="line-title" meta="Percent" />
      <div className={styles.lineStage}>
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
          {[25, 50, 75].map((value) => (
            <line
              className={styles.gridLine}
              key={value}
              x1="20"
              x2={width - 20}
              y1={height - 24 - (value / 100) * (height - 48)}
              y2={height - 24 - (value / 100) * (height - 48)}
            />
          ))}
          <polygon className={styles.lineArea} points={area} />
          <polyline className={styles.lineShadow} points={line} />
          <motion.polyline
            className={styles.mainLine}
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            points={line}
          />
        </svg>
        {coordinates.map((point) => (
          <button
            aria-label={`${point.label}, ${point.value}% completion`}
            className={styles.linePoint}
            key={point.id}
            onClick={(event) => {
              event.stopPropagation();
              onSelect({
                chart: 'line',
                id: point.id,
                label: point.label,
                value: `${point.value}% completion`,
              });
            }}
            style={
              {
                '--x': `${(point.x / width) * 100}%`,
                '--y': `${(point.y / height) * 100}%`,
              } as VariableStyle
            }
            type="button"
          >
            <span className={styles.tooltip}>{point.value}%</span>
          </button>
        ))}
      </div>
      <div className={styles.lineLabels}>
        {data.map((point) => (
          <span key={point.id}>{point.label}</span>
        ))}
      </div>
    </motion.section>
  );
}

const ringGradient = (segments: DistributionSegment[]) => {
  let offset = 0;
  return `conic-gradient(${segments
    .map((segment) => {
      const start = offset;
      offset += segment.value;
      return `var(--series-${segment.series}) ${start}% ${offset}%`;
    })
    .join(', ')})`;
};

export function SegmentedDonutChart({
  title,
  eyebrow,
  data,
  chart,
  onSelect,
}: {
  title: string;
  eyebrow: string;
  data: DistributionSegment[];
  chart: 'task-state' | 'rarity';
  onSelect: SelectHandler;
}) {
  const total = data.reduce((value, segment) => value + segment.value, 0);
  return (
    <section
      className={`${styles.module} ${styles.donutModule}`}
      aria-labelledby={`${chart}-title`}
    >
      <ModuleHeader eyebrow={eyebrow} title={title} id={`${chart}-title`} />
      <div className={styles.donutLayout}>
        <div
          className={styles.donut}
          aria-hidden="true"
          style={{ '--ring': ringGradient(data) } as VariableStyle}
        >
          <div>
            <strong>{total}</strong>
            <span>%</span>
          </div>
        </div>
        <div className={styles.donutLegend}>
          {data.map((segment) => (
            <button
              key={segment.id}
              onClick={(event) => {
                event.stopPropagation();
                onSelect({
                  chart,
                  id: segment.id,
                  label: segment.label,
                  value: `${segment.value}%`,
                });
              }}
              type="button"
            >
              <i style={{ '--swatch': `var(--series-${segment.series})` } as VariableStyle} />
              <span>{segment.label}</span>
              <strong>{segment.value}%</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GeometricComparisonChart({
  data,
  onSelect,
}: {
  data: ComparisonDatum[];
  onSelect: SelectHandler;
}) {
  const maximum = Math.max(1, ...data.map((datum) => datum.value));
  return (
    <section
      className={`${styles.module} ${styles.comparisonModule}`}
      aria-labelledby="comparison-title"
    >
      <ModuleHeader
        eyebrow="EFFORT"
        title="Task weight"
        id="comparison-title"
        meta="Relative load"
      />
      <div className={styles.shapeStage}>
        {data.map((datum, index) => (
          <button
            aria-label={`${datum.label}, relative load ${datum.value}`}
            className={styles.shapeButton}
            key={datum.id}
            onClick={(event) => {
              event.stopPropagation();
              onSelect({
                chart: 'comparison',
                id: datum.id,
                label: datum.label,
                value: `${datum.value} load`,
              });
            }}
            style={
              {
                '--scale': 0.62 + (datum.value / maximum) * 0.5,
                '--series-index': index + 1,
              } as VariableStyle
            }
            type="button"
          >
            <span className={`${styles.geoShape} ${styles[datum.shape]}`} aria-hidden="true">
              <i />
            </span>
            <span>{datum.label}</span>
            <strong>{datum.value}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

export function CategoryControls({
  value,
  onChange,
}: {
  value: AnalyticsCategory;
  onChange: (category: AnalyticsCategory) => void;
}) {
  return (
    <nav className={styles.categoryControls} aria-label="Task category filter">
      {(Object.keys(categoryProfiles) as AnalyticsCategory[]).map((category, index) => (
        <button
          aria-pressed={value === category}
          className={value === category ? styles.activeCategory : ''}
          key={category}
          onClick={(event) => {
            event.stopPropagation();
            onChange(category);
          }}
          style={{ '--series-index': (index % 4) + 1 } as VariableStyle}
          type="button"
        >
          <i />
          {categoryProfiles[category].label}
        </button>
      ))}
    </nav>
  );
}

export function TechnicalGrid({
  data,
  onSelect,
}: {
  data: TechnicalPoint[];
  onSelect: SelectHandler;
}) {
  return (
    <section
      className={`${styles.module} ${styles.technicalModule}`}
      aria-labelledby="technical-title"
    >
      <ModuleHeader
        eyebrow="VECTOR MAP"
        title="Energy / time field"
        id="technical-title"
        meta="3-axis"
      />
      {data.length ? (
        <div
          className={styles.technicalPlot}
          role="group"
          aria-label="Tasks plotted by mental energy, physical energy, and time"
        >
          <div className={styles.planeGrid} aria-hidden="true" />
          {data.map((point, index) => (
            <button
              aria-label={`${point.label}: mental ${point.mental}, physical ${point.physical}, time ${point.time}`}
              className={styles.technicalPoint}
              key={point.id}
              onClick={(event) => {
                event.stopPropagation();
                onSelect({
                  chart: 'technical',
                  id: point.id,
                  label: point.label,
                  value: `M ${point.mental} · P ${point.physical} · T ${point.time}`,
                });
              }}
              style={
                {
                  '--x': `${point.mental}%`,
                  '--y': `${100 - point.physical}%`,
                  '--depth': `${point.time / 12}px`,
                  '--series-index': (index % 4) + 1,
                } as VariableStyle
              }
              type="button"
            >
              <span className={styles.tooltip}>{point.label}</span>
            </button>
          ))}
          <span className={styles.xAxis}>Mental energy →</span>
          <span className={styles.yAxis}>Physical energy →</span>
        </div>
      ) : (
        <div className={styles.emptyState}>No vector data in this filter.</div>
      )}
    </section>
  );
}

export function DashboardDataTables({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <section className={styles.dataTables} aria-labelledby="data-tables-title">
      <div className={styles.moduleHeader}>
        <span>ACCESSIBLE VIEW</span>
        <div>
          <h2 id="data-tables-title">Dashboard data tables</h2>
          <small>Current filters</small>
        </div>
      </div>
      <div className={styles.tableGrid}>
        <table>
          <caption>Planned and completed tasks</caption>
          <thead>
            <tr>
              <th>Period</th>
              <th>Planned</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.series.map((point) => (
              <tr key={point.id}>
                <th>{point.label}</th>
                <td>{point.planned}</td>
                <td>{point.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table>
          <caption>Completion rhythm</caption>
          <thead>
            <tr>
              <th>Period</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.completionRate.map((point) => (
              <tr key={point.id}>
                <th>{point.label}</th>
                <td>{point.value}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table>
          <caption>Distributions</caption>
          <thead>
            <tr>
              <th>Series</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            {[...snapshot.taskState, ...snapshot.rarity].map((segment, index) => (
              <tr key={`${segment.id}-${index}`}>
                <th>{segment.label}</th>
                <td>{segment.value}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table>
          <caption>Energy and time vectors</caption>
          <thead>
            <tr>
              <th>Task</th>
              <th>Mental</th>
              <th>Physical</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.technical.map((point) => (
              <tr key={point.id}>
                <th>{point.label}</th>
                <td>{point.mental}</td>
                <td>{point.physical}</td>
                <td>{point.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
