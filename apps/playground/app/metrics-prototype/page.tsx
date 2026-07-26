import type { Metadata } from 'next';
import { AnalyticsDashboard } from './analytics-dashboard';

export const metadata: Metadata = {
  title: 'Metrics Lab | Arsenal',
  description: 'An interactive dimensional analytics prototype for Arsenal.',
};

export default function MetricsPrototypePage() {
  return <AnalyticsDashboard />;
}
