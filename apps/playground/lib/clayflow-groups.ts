import {
  COMPONENT_STATE_SPECS,
  CONNECTOR_SPECS,
  EXAMPLE_DIAGRAMS,
  TRANSFORMATION_RECIPES,
  type DiagramSpec,
} from '@arsenal/clayflow';

/** Sub-tabs of the ClayFlow tab on /components. `stock` renders stock-kit cards, not diagrams. */
export type ClayFlowGroupId = 'nodes' | 'connectors' | 'flows' | 'transformations' | 'stock';

export interface ClayFlowGroup {
  id: ClayFlowGroupId;
  label: string;
  blurb: string;
  specs: readonly DiagramSpec[];
  /** Where the full, interactive version of this group lives. */
  href: string;
}

export const CLAYFLOW_GROUPS: readonly ClayFlowGroup[] = [
  {
    id: 'nodes',
    label: 'Nodes & states',
    blurb: 'Each node family moving through ready, active, error and complete.',
    specs: COMPONENT_STATE_SPECS,
    href: '/clayflow/showcase#states-title',
  },
  {
    id: 'connectors',
    label: 'Connectors',
    blurb: 'Every route shape: direction, branches, conditions and feedback loops.',
    specs: CONNECTOR_SPECS,
    href: '/clayflow/showcase#connectors-title',
  },
  {
    id: 'flows',
    label: 'Flows',
    blurb: 'Complete diagrams you can play, step through and inspect.',
    specs: Object.values(EXAMPLE_DIAGRAMS),
    href: '/clayflow/showcase#examples-title',
  },
  {
    id: 'transformations',
    label: 'Transformations',
    blurb: 'A node changes what it means while its flow stays in place.',
    specs: TRANSFORMATION_RECIPES,
    href: '/clayflow/showcase#recipes-title',
  },
  {
    id: 'stock',
    label: 'Stock kit',
    blurb: 'Clay dashboard cards for stock research. All figures are sample data.',
    specs: [],
    href: '/stock-intelligence',
  },
];

export const CLAYFLOW_COMPONENT_COUNT = CLAYFLOW_GROUPS.reduce(
  (sum, group) => sum + group.specs.length,
  0,
);
