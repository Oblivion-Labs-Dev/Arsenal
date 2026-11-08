import type { Metadata } from 'next';
import { ClayFlowLab } from './clayflow-lab';

export const metadata: Metadata = {
  title: 'ClayFlow | Arsenal',
  description: 'Claymorphic diagram components ported from Manthan: nodes, connectors, groups, annotations and motion presets.',
};

export default function ClayFlowPage() {
  return <ClayFlowLab />;
}
