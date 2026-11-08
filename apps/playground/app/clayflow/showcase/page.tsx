import type { Metadata } from 'next';
import { ClayFlowShowcase } from './showcase';

export const metadata: Metadata = {
  title: 'ClayFlow Animation Showcase | Arsenal',
  description: 'Explore ClayFlow node states, connectors, animation recipes, and interactive example diagrams.',
};

export default function ClayFlowShowcasePage() {
  return <ClayFlowShowcase />;
}
