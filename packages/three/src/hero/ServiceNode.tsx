import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { heroTime, type HeroGroupProps, type HeroPieceProps, useHeroEnv } from './shared';
import { StatusClock, isFocused, statusColor, type HeroStatus } from './status';

const DIM = new THREE.Color('#4c493f');
const WINDOWS = [-0.105, 0, 0.105] as const;

/** Status-ring scale for a status at time `t`: hidden at rest, pulsing on failure. */
export function serviceRingScale(status: HeroStatus, t: number, animate: boolean): number {
  if (status === 'failure') return 1.04 + (animate ? Math.max(0, Math.sin(t * 7.5)) * 0.18 : 0);
  if (status === 'recovery') return 1.02;
  if (status === 'dependency') return 0.92;
  return isFocused(status) ? 1 : 0;
}

export type ServiceNodeProps = HeroGroupProps &
  HeroPieceProps & {
    /** Interaction state: idle, hover, selected, dependency, failure (red pulse), recovery (red → green → amber). */
    status?: HeroStatus;
    /** Body height multiplier, to vary a row of nodes. Default 1. */
    height?: number;
    /** Pointer enter/leave on the node. */
    onHoverChange?: (hovered: boolean) => void;
    onSelect?: () => void;
  };

/**
 * A service module: a small machined block on a slab with three lit windows, an indicator bar
 * and a status ring underneath. Windows and ring take the status colour.
 */
export function ServiceNode({
  status = 'idle',
  height = 1,
  light: lightProp,
  reducedMotion: reducedProp,
  onHoverChange,
  onSelect,
  ...group
}: ServiceNodeProps) {
  const { light, reducedMotion } = useHeroEnv(lightProp, reducedProp);
  const ring = useRef<THREE.Mesh>(null);
  const clock = useMemo(() => new StatusClock(), []);
  const lit = useMemo(
    () => new THREE.MeshBasicMaterial({ color: light ? '#c58c48' : '#f6ac45', toneMapped: false }),
    [light],
  );
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(() => () => lit.dispose(), [lit]);
  useEffect(() => () => ringMaterial.dispose(), [ringMaterial]);

  useFrame((frame) => {
    const now = frame.clock.elapsedTime;
    const elapsed = reducedMotion ? Infinity : clock.elapsed('node', status, now);
    statusColor(status, elapsed, light, lit.color);
    // Windows burn brighter than white in dark mode so bloom gives them the plate's glow.
    if (!light) lit.color.multiplyScalar(1.9);
    if (status === 'failure' && !reducedMotion) {
      lit.color.multiplyScalar(0.66 + Math.max(0, Math.sin(now * 7.5)) * 0.34);
    }
    const mesh = ring.current;
    if (!mesh) return;
    const scale = serviceRingScale(status, heroTime(now, reducedMotion), !reducedMotion);
    mesh.visible = scale > 0;
    mesh.scale.setScalar(Math.max(scale, 0.0001));
    if (status === 'dependency') ringMaterial.color.copy(DIM).lerp(lit.color, 0.5);
    else ringMaterial.color.copy(lit.color);
  });

  const handlers = {
    onPointerOver: onHoverChange
      ? (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onHoverChange(true);
        }
      : undefined,
    onPointerOut: onHoverChange
      ? (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          onHoverChange(false);
        }
      : undefined,
    onClick: onSelect
      ? (event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect();
        }
      : undefined,
  };
  // Dark carved stone on a mossy slab, as in the plate.
  const structure = light ? '#6b7a32' : '#3c4a16';
  const cap = light ? '#6d6556' : '#1f1e1b';
  const body = light ? '#5e574b' : '#151513';
  const bodyHeight = 0.24 * height;

  return (
    <group {...group}>
      <group {...handlers}>
        <mesh position={[0, -0.11, 0]} scale={[0.58, 0.12, 0.45]} castShadow receiveShadow>
          <boxGeometry />
          <meshStandardMaterial color={structure} roughness={0.9} flatShading />
        </mesh>
        <mesh
          position={[0, -0.075 + bodyHeight / 2, 0]}
          scale={[0.36, bodyHeight, 0.32]}
          castShadow
          receiveShadow
        >
          <boxGeometry />
          <meshStandardMaterial color={body} metalness={0.1} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.055 + bodyHeight, 0]} scale={[0.41, 0.035, 0.37]} castShadow>
          <boxGeometry />
          <meshStandardMaterial color={cap} metalness={0.1} roughness={0.75} />
        </mesh>
        {WINDOWS.map((x) => (
          <mesh key={x} position={[x, 0.045, 0.164]} scale={[0.062, 0.105, 0.018]} material={lit}>
            <boxGeometry />
          </mesh>
        ))}
        <mesh position={[0, -0.07, 0.164]} scale={[0.26, 0.035, 0.018]} material={lit}>
          <boxGeometry />
        </mesh>
      </group>
      <mesh
        ref={ring}
        position={[0, -0.022, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={ringMaterial}
        visible={false}
      >
        <ringGeometry args={[0.31, 0.35, 40]} />
      </mesh>
    </group>
  );
}
