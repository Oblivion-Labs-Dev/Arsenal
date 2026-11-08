import type { Metadata } from 'next';
import { ContextDashboard } from '@/components/context-dashboard/context-dashboard';

export const metadata: Metadata = {
  title: 'Context',
  description: 'Token savings, context quality and preprocessing analytics for Arsenal.',
};

export default function ContextPage() {
  return (
    <div className="site-container">
      <header className="max-w-3xl pt-10">
        <div className="site-label">Intelligence</div>
        <h1 className="site-title mt-3">Context</h1>
        <p className="site-lede mt-4">
          How much context Arsenal saves, how good it is, and where to optimise next.
        </p>
      </header>
      <div className="mt-10">
        <ContextDashboard />
      </div>
    </div>
  );
}
