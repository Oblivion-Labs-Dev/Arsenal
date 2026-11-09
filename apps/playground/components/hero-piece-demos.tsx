'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  BonsaiTree,
  CoreSphere,
  DEFAULT_CORE_NODES,
  DataPath,
  HeroStage,
  IslandBase,
  OrbitalRing,
  SceneAccents,
  ServiceNode,
  WaterBasin,
  Waterfall,
  type CoreNode,
  type HeroStatus,
  type HeroStageProps,
  type Vec3,
} from '@arsenal/three';

export type HeroPieceId =
  | 'island-base'
  | 'bonsai-tree'
  | 'waterfall'
  | 'water-basin'
  | 'orbital-ring'
  | 'core-sphere'
  | 'service-node'
  | 'data-path'
  | 'scene-accents';

/** Flips between failure and recovery so the recovery fade (red → green → amber) keeps replaying. */
function useFailRecoverLoop(period = 4.5): HeroStatus {
  const [status, setStatus] = useState<HeroStatus>('failure');
  useEffect(() => {
    const id = window.setInterval(
      () => setStatus((s) => (s === 'failure' ? 'recovery' : 'failure')),
      period * 1000,
    );
    return () => window.clearInterval(id);
  }, [period]);
  return status;
}

function Frame({
  children,
  camera,
  labels,
}: {
  children: ReactNode;
  camera: HeroStageProps['camera'];
  labels?: string[];
}) {
  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl bg-arsenal-surface">
      <HeroStage camera={camera}>{children}</HeroStage>
      {labels ? (
        <div
          className="pointer-events-none absolute inset-x-4 bottom-3 grid text-center text-[11px] font-medium text-arsenal-secondary"
          style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
        >
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const STATES: HeroStatus[] = ['idle', 'hover', 'selected', 'dependency', 'failure', 'recovery'];
const STATE_LABELS = ['Idle', 'Hover', 'Selected', 'Dependency', 'Failure', 'Recovery'];

function ServiceNodeStates() {
  const loop = useFailRecoverLoop();
  const [hovered, setHovered] = useState(false);
  return (
    <Frame camera={{ position: [0, 1.15, 3.9], target: [0, 0, 0], fov: 34 }} labels={STATE_LABELS}>
      {STATES.map((status, index) => (
        <ServiceNode
          key={status}
          position={[(index - 2.5) * 0.62, 0, 0]}
          status={status === 'recovery' ? (loop === 'failure' ? 'failure' : 'recovery') : status}
          {...(status === 'idle'
            ? { onHoverChange: setHovered, status: hovered ? 'hover' : 'idle' }
            : null)}
        />
      ))}
    </Frame>
  );
}

const SERVICE_A: Vec3 = [-1.25, 0, 0];
const SERVICE_B: Vec3 = [1.25, 0, 0];
const SERVICE_C: Vec3 = [0, 0, -1.1];

function DataPathDemo() {
  const loop = useFailRecoverLoop(3.2);
  return (
    <Frame camera={{ position: [0, 2.2, 4.6], target: [0, 0.25, -0.3], fov: 34 }}>
      <ServiceNode position={SERVICE_A} status="selected" />
      <ServiceNode position={SERVICE_B} status="dependency" />
      <ServiceNode position={SERVICE_C} status={loop} />
      <DataPath from={SERVICE_A} to={SERVICE_B} kind="request" active period={1.6} />
      <DataPath from={SERVICE_B} to={SERVICE_A} kind="response" lift={0.7} period={1.9} />
      <DataPath from={SERVICE_A} to={SERVICE_C} kind="telemetry" lift={0.5} period={1.3} />
      <DataPath
        from={SERVICE_B}
        to={SERVICE_C}
        kind="fallback"
        lift={0.6}
        error={loop === 'failure'}
        dimmed={loop === 'failure'}
      />
    </Frame>
  );
}

function CoreSphereDemo() {
  const loop = useFailRecoverLoop();
  const nodes: CoreNode[] = DEFAULT_CORE_NODES.map((node, index) =>
    index === 2 ? { ...node, status: loop } : index === 6 ? { ...node, status: 'selected' } : node,
  );
  return (
    <Frame camera={{ position: [0, 0.6, 4.2], target: [0, 0.1, 0], fov: 34 }}>
      <CoreSphere nodes={nodes} />
    </Frame>
  );
}

const DEMOS: Record<HeroPieceId, () => ReactNode> = {
  'island-base': () => (
    <Frame camera={{ position: [0, 2.2, 7.4], target: [0, -0.5, 0], fov: 34 }}>
      <IslandBase />
    </Frame>
  ),
  'bonsai-tree': () => (
    <Frame camera={{ position: [0, 1.5, 5.6], target: [0, 1.0, 0], fov: 34 }}>
      <BonsaiTree />
    </Frame>
  ),
  waterfall: () => (
    <Frame camera={{ position: [0, -0.4, 2.8], target: [0, -0.6, 0], fov: 34 }}>
      <Waterfall position={[0, 0, 0]} />
      <WaterBasin position={[0, -1.18, 0]} size={[4, 3]} ripples={[[0, 0, 0.1]]} />
    </Frame>
  ),
  'water-basin': () => (
    <Frame camera={{ position: [0, 2.4, 4.4], target: [0, 0, 0], fov: 34 }}>
      <WaterBasin
        size={[8, 6]}
        ripples={[
          [0, 0, 0],
          [-1.2, 0, 0.5],
          [1.3, 0, -0.4],
        ]}
      />
    </Frame>
  ),
  'orbital-ring': () => (
    <Frame camera={{ position: [0, 1.4, 6], target: [0, 0, 0], fov: 34 }}>
      <OrbitalRing radius={1.7} tilt={[0.18, -0.08]} period={24} />
      <OrbitalRing radius={2.2} tilt={[-0.12, 0.14]} period={36} phase={2.1} active />
    </Frame>
  ),
  'core-sphere': () => <CoreSphereDemo />,
  'service-node': () => <ServiceNodeStates />,
  'data-path': () => <DataPathDemo />,
  'scene-accents': () => (
    <Frame camera={{ position: [0, 2.2, 5.6], target: [0, 0.1, 0], fov: 34 }}>
      <IslandBase pond={false} />
      <SceneAccents />
    </Frame>
  ),
};

export function HeroPieceDemo({ piece }: { piece: HeroPieceId }) {
  const Demo = DEMOS[piece];
  return <Demo />;
}
