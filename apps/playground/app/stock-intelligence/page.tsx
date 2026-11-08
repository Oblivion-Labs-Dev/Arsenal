import type { Metadata } from 'next';
import '@arsenal/stock-kit/styles.css';
import '@arsenal/clayflow/react.css';
import { StockIntelligenceDashboard } from './dashboard';

export const metadata: Metadata = {
  title: 'Stock Intelligence | Arsenal',
  description:
    'An illustrative, beginner-friendly stock intelligence dashboard built with Manthan clay components.',
};

export default function StockIntelligencePage() {
  // The site header floats over the page; offset so it never covers the dashboard or its sample-data notice.
  return (
    <div className="pt-[calc(var(--site-header-h)+1.25rem)]">
      <StockIntelligenceDashboard />
    </div>
  );
}
