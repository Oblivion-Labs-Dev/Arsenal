import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heroTime, type HeroGroupProps, type HeroPieceProps, type Vec3, useHeroEnv } from './shared';
import { HERO_COLORS } from './status';

export type DataPathKind = 'request' | 'response' | 'telemetry' | 'fallback';

const PATH_COLOR: Record<DataPathKind, string> = {
  request: '#ffc766',
  response: '#dec89e',
  telemetry: '#89949a',
  fallback: '#ffb74f',
};
const LIGHT_PATH_COLOR: Record<DataPathKind, string> = {
  request: '#9b6429',
  response: '#756b59',
  telemetry: '#7a807e',
  fallback: '#a15d26',
};

/** An arc from `from` to `to`, its control point lifted `lift` above the midpoint. */
export function dataPathCurve(from: Vec3, to: Vec3, lift = 1.18): THREE.QuadraticBezierCurve3 {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const control = start.clone().add(end).multiplyScalar(0.5);
  control.y += lift;
  return new THREE.QuadraticBezierCurve3(start, control, end);
}

/** Path opacity for its emphasis: dimmed (a failed neighbour) < resting < active (hover/selected). */
export function dataPathOpacity(kind: DataPathKind, active: boolean, dimmed: boolean): number {
  if (dimmed) return 0.13;
  if (kind === 'telemetry') return active ? 0.42 : 0.18;
  return active ? 0.82 : 0.29;
}

export type DataPathProps = HeroGroupProps &
  HeroPieceProps & {
    from: Vec3;
    to: Vec3;
    kind?: DataPathKind;
    /** Arc height above the midpoint. Default 1.18. */
    lift?: number;
    /** Highlight the path (its endpoint is hovered or selected). */
    active?: boolean;
    /** Fade the path, e.g. next to a failed node. */
    dimmed?: boolean;
    /** Send a packet along the path. Default true. */
    pulse?: boolean;
    /** Seconds per packet trip; the reference times data pulses at 1–2s. Default 1.6. */
    period?: number;
    /** Packet turns red and fades halfway, as if blocked. */
    error?: boolean;
  };

/**
 * A data path: a thin glowing tube arcing between two points, with a packet travelling along it.
 * Coordinates are in the parent's space, so place it beside the nodes it connects.
 */
export function DataPath({
  from,
  to,
  kind = 'request',
  lift = 1.18,
  active = false,
  dimmed = false,
  pulse = true,
  period = 1.6,
  error = false,
  light: lightProp,
  reducedMotion: reducedProp,
  ...group
}: DataPathProps) {
  const { light, reducedMotion } = useHeroEnv(lightProp, reducedProp);
  const packet = useRef<THREE.Mesh>(null);
  const [fx, fy, fz] = from;
  const [tx, ty, tz] = to;
  const curve = useMemo(
    () => dataPathCurve([fx, fy, fz], [tx, ty, tz], lift),
    [fx, fy, fz, tx, ty, tz, lift],
  );
  const telemetry = kind === 'telemetry';
  const tube = useMemo(
    () => new THREE.TubeGeometry(curve, telemetry ? 24 : 32, telemetry ? 0.008 : 0.014, 5, false),
    [curve, telemetry],
  );
  useEffect(() => () => tube.dispose(), [tube]);
  const packetMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: HERO_COLORS.accent, transparent: true, toneMapped: false }),
    [],
  );
  useEffect(() => () => packetMaterial.dispose(), [packetMaterial]);

  useFrame((frame) => {
    const mesh = packet.current;
    if (!mesh) return;
    mesh.visible = pulse && !reducedMotion;
    if (!mesh.visible) return;
    const safePeriod = period > 0 ? period : 1.6;
    const progress = (heroTime(frame.clock.elapsedTime, reducedMotion) % safePeriod) / safePeriod;
    curve.getPointAt(progress, mesh.position);
    packetMaterial.color.set(error ? HERO_COLORS.error : HERO_COLORS.accent).multiplyScalar(light ? 1 : 2);
    packetMaterial.opacity = error ? Math.max(0.08, 1 - progress * 2) : 0.95;
  });

  return (
    <group {...group}>
      <mesh geometry={tube}>
        <meshBasicMaterial
          color={light ? LIGHT_PATH_COLOR[kind] : PATH_COLOR[kind]}
          transparent
          opacity={dataPathOpacity(kind, active, dimmed)}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={packet}
        visible={false}
        scale={telemetry ? 0.022 : 0.055}
        material={packetMaterial}
      >
        <sphereGeometry args={[1, 12, 10]} />
      </mesh>
    </group>
  );
}
