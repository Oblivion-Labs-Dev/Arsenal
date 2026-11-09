'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  BONSAI_DEFAULT_SEED,
  BonsaiStudio,
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

/** The bonsai on its orbitable studio turntable, with the few knobs worth turning. */
function BonsaiStudioDemo() {
  const [seed, setSeed] = useState(BONSAI_DEFAULT_SEED);
  const [density, setDensity] = useState(1);
  const [wind, setWind] = useState(1);
  const [pot, setPot] = useState(true);
  const [turntable, setTurntable] = useState(true);
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
  const control = 'flex items-center gap-2 text-[11px] font-medium text-arsenal-secondary';
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-arsenal-surface">
      <div className="h-[460px] w-full">
        <BonsaiStudio autoRotate={turntable} quality={quality}>
          <BonsaiTree seed={seed} foliageDensity={density} wind={wind} pot={pot} quality={quality} />
        </BonsaiStudio>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-arsenal-border px-4 py-2.5">
        <label className={control}>
          Seed
          <input
            type="number"
            min={1}
            max={9999}
            value={seed}
            onChange={(event) => setSeed(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
            className="w-16 rounded-md border border-arsenal-border bg-arsenal-elevated px-1.5 py-0.5 text-arsenal-primary tabular-nums"
          />
          <button
            type="button"
            onClick={() => setSeed((s) => (s % 9999) + 1)}
            className="rounded-md border border-arsenal-border px-2 py-0.5 text-arsenal-primary hover:bg-arsenal-elevated"
          >
            Next
          </button>
        </label>
        <label className={control}>
          Density
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={density}
            onChange={(event) => setDensity(Number(event.target.value))}
            className="w-24 accent-[var(--arsenal-accent)]"
          />
          <span className="w-8 tabular-nums text-arsenal-primary">{density.toFixed(2)}</span>
        </label>
        <label className={control}>
          Wind
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={wind}
            onChange={(event) => setWind(Number(event.target.value))}
            className="w-24 accent-[var(--arsenal-accent)]"
          />
          <span className="w-8 tabular-nums text-arsenal-primary">{wind.toFixed(2)}</span>
        </label>
        <label className={control}>
          <input type="checkbox" checked={pot} onChange={(event) => setPot(event.target.checked)} />
          Pot
        </label>
        <label className={control}>
          <input type="checkbox" checked={turntable} onChange={(event) => setTurntable(event.target.checked)} />
          Turntable
        </label>
        <label className={control}>
          Quality
          <select
            value={quality}
            onChange={(event) => setQuality(event.target.value as 'high' | 'medium' | 'low')}
            className="rounded-md border border-arsenal-border bg-arsenal-elevated px-1.5 py-0.5 text-arsenal-primary"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <span className="ml-auto text-[11px] text-arsenal-secondary">Drag to orbit, scroll to zoom</span>
      </div>
    </div>
  );
}

const DEMOS: Record<HeroPieceId, () => ReactNode> = {
  'island-base': () => (
    <Frame camera={{ position: [0, 2.2, 7.4], target: [0, -0.5, 0], fov: 34 }}>
      <IslandBase />
    </Frame>
  ),
  'bonsai-tree': () => <BonsaiStudioDemo />,
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
