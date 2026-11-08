import type { Metadata } from 'next';
import '@arsenal/stock-kit/styles.css';
import '@arsenal/clayflow/react.css';
import './reports.css';
import { ReportsReader } from './reports-reader';

export const metadata: Metadata = {
  title: 'Manthan Reports | Arsenal',
  description: 'An editorial report reader with illustrative stories and ClayFlow diagrams.',
};

export default function ReportsPage() {
  return <ReportsReader />;
}
