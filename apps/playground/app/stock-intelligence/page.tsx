import type { Metadata } from 'next';
import '@arsenal/stock-kit';
import '@arsenal/clayflow/react.css';
import { StockIntelligenceDashboard } from './dashboard';

export const metadata: Metadata = {
  title: 'Stock Intelligence | Arsenal',
  description:
    'An illustrative, beginner-friendly stock intelligence dashboard built with Manthan clay components.',
};

export default function StockIntelligencePage() {
  return <StockIntelligenceDashboard />;
}
