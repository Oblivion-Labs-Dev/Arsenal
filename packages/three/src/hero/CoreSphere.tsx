import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heroTime, type HeroGroupProps, type HeroPieceProps, type Vec3, useHeroEnv } from './shared';
import { StatusClock, statusColor, type HeroStatus } from './status';

const NODE_COLOR = new THREE.Color();
/** Gold pushed past 1 so bloom catches it, like the plate's lit network. */
const GOLD_HOT = new THREE.Color('#ffc766').multiplyScalar(1.8);

const marbleVertexShader = `
  varying vec3 vLocal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  void main() {
    vLocal = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDirection = cameraPosition - worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const marbleFragmentShader = `
  uniform float uTime;
  uniform float uRadius;
  uniform vec3 uDeep;
  uniform vec3 uSmoke;
  uniform vec3 uVein;
  uniform vec3 uGlow;
  varying vec3 vLocal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(17.1, 113.7, 41.3))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) { total += noise(p) * amp; p = p * 2.03 + 3.1; amp *= 0.5; }
    return total;
  }
  void main() {
    vec3 p = vLocal / uRadius * 1.6 + vec3(0.0, uTime * 0.03, 0.0);
    // Smoky marble: warped noise folded into thin bright veins over deep glass.
    float warp = fbm(p + fbm(p * 1.3) * 1.8);
    float veins = pow(1.0 - abs(warp * 2.0 - 1.0), 9.0);
    float facing = max(dot(normalize(vWorldNormal), normalize(vViewDirection)), 0.0);
    float rim = pow(1.0 - facing, 2.6);
    // The underside glows warmer, lit from the hotspot below.
    float under = smoothstep(0.1, -1.0, vLocal.y / uRadius);
    vec3 color = mix(uDeep, uSmoke, smoothstep(0.35, 0.75, warp));
    color += uVein * veins * (0.35 + rim);
    color += uGlow * (under * 0.35 + rim * 0.55);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const beamVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragmentShader = `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    // Bright where it leaves the sphere, fading to nothing at the island.
    float fade = pow(vUv.y, 2.2);
    float core = pow(abs(sin(vUv.x * 3.1416)), 2.0);
    gl_FragColor = vec4(uColor, fade * core * uStrength);
  }
`;

const rimVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDirection = cameraPosition - worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const rimFragmentShader = `
  uniform float uLightMode;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  void main() {
    float facing = max(dot(normalize(vWorldNormal), normalize(vViewDirection)), 0.0);
    float rim = pow(1.0 - facing, 3.2);
    vec3 amber = uLightMode > 0.5 ? vec3(0.42, 0.29, 0.14) : vec3(0.92, 0.58, 0.22);
    float alpha = rim * (uLightMode > 0.5 ? 0.16 : 0.32);
    gl_FragColor = vec4(amber, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** A node on the sphere. `direction` is any vector; it is projected onto the surface. */
export interface CoreNode {
  direction: Vec3;
  status?: HeroStatus;
  /** Larger marker for the hub node. */
  hub?: boolean;
}

/** Evenly spread directions on a sphere (Fibonacci lattice); deterministic. */
export function fibonacciDirections(count: number): Vec3[] {
  const out: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    out.push([Math.cos(golden * i) * r, y, Math.sin(golden * i) * r]);
  }
  return out;
}

/** Project a direction onto a sphere of `radius`; a zero vector lands on +y. */
export function onSphere([x, y, z]: Vec3, radius: number): Vec3 {
  const length = Math.hypot(x, y, z);
  if (!length) return [0, radius, 0];
  return [(x / length) * radius, (y / length) * radius, (z / length) * radius];
}

/** Default graph: nine lattice nodes around a hub, a few cross links. */
export const DEFAULT_CORE_NODES: readonly CoreNode[] = fibonacciDirections(9).map(
  (direction, index) => ({ direction, hub: index === 4 }),
);
export const DEFAULT_CORE_LINKS: ReadonlyArray<readonly [number, number]> = [
  [4, 0], [4, 1], [4, 2], [4, 3], [4, 5], [4, 6], [4, 7], [4, 8], [1, 2], [6, 7], [3, 5],
];

export type CoreSphereProps = HeroGroupProps &
  HeroPieceProps & {
    radius?: number;
    nodes?: readonly CoreNode[];
    /** Pairs of node indices drawn as surface links. */
    links?: ReadonlyArray<readonly [number, number]>;
    /** Energy beam under the sphere. Default true. */
    beam?: boolean;
    /** Strength of the warm light the core casts on nearby pieces; 0 turns it off. Default 1. */
    glow?: number;
    /** Spin in radians per second. */
    spin?: number;
  };

/**
 * The core sphere: a dark glass orb with a fresnel amber rim, a slow-turning service graph on its
 * surface (nodes + links, each node colourable by status) and a soft energy beam below.
 */
export function CoreSphere({
  radius = 0.84,
  nodes = DEFAULT_CORE_NODES,
  links = DEFAULT_CORE_LINKS,
  beam = true,
  glow = 1,
  spin = 0.045,
  light: lightProp,
  reducedMotion: reducedProp,
  ...group
}: CoreSphereProps) {
  const { light, reducedMotion } = useHeroEnv(lightProp, reducedProp);
  const coreRef = useRef<THREE.Group>(null);
  const nodeRef = useRef<THREE.InstancedMesh>(null);
  const clock = useMemo(() => new StatusClock(), []);
  const s = radius / 0.84;
  const nodeRadius = radius * (0.78 / 0.84);
  const nodeTransform = useMemo(() => new THREE.Object3D(), []);
  const nodeGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const nodeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    [light],
  );
  const graph = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const points: number[] = [];
    for (const [from, to] of links) {
      const a = nodes[from];
      const b = nodes[to];
      if (!a || !b) continue;
      points.push(...onSphere(a.direction, nodeRadius), ...onSphere(b.direction, nodeRadius));
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, [links, nodes, nodeRadius]);
  useEffect(() => () => graph.dispose(), [graph]);
  const boost = light ? 1 : 2.4;
  const marble = useMemo(
    () => ({
      uTime: { value: 0 },
      uRadius: { value: 1 },
      uDeep: { value: new THREE.Color() },
      uSmoke: { value: new THREE.Color() },
      uVein: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
    }),
    [],
  );
  marble.uRadius.value = radius;
  marble.uDeep.value.set(light ? '#4f4639' : '#040607');
  marble.uSmoke.value.set(light ? '#7d705c' : '#1c2427');
  marble.uVein.value.set(light ? '#c9b48e' : '#6d7c80');
  marble.uGlow.value.set(light ? '#8f6633' : '#b8742a');
  const beamUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color() }, uStrength: { value: 0 } }),
    [],
  );
  beamUniforms.uColor.value.set(light ? '#b58b4a' : '#ffb84f');
  beamUniforms.uStrength.value = light ? 0.25 : 0.7;
  useEffect(() => () => nodeGeometry.dispose(), [nodeGeometry]);
  useEffect(() => () => nodeMaterial.dispose(), [nodeMaterial]);

  useLayoutEffect(() => {
    const mesh = nodeRef.current;
    if (!mesh) return;
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index]!;
      nodeTransform.position.set(...onSphere(node.direction, nodeRadius));
      nodeTransform.scale.setScalar((node.hub ? 0.082 : 0.064) * s);
      nodeTransform.updateMatrix();
      mesh.setMatrixAt(index, nodeTransform.matrix);
      mesh.setColorAt(index, statusColor(node.status ?? 'idle', 0, light, NODE_COLOR).multiplyScalar(boost));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boost, light, nodeTransform, nodes, nodeRadius, s]);

  useFrame((frame) => {
    const now = frame.clock.elapsedTime;
    const time = heroTime(now, reducedMotion);
    if (coreRef.current) coreRef.current.rotation.y = time * spin;
    marble.uTime.value = time;
    const mesh = nodeRef.current;
    if (!mesh) return;
    for (let index = 0; index < nodes.length; index++) {
      const status = nodes[index]!.status ?? 'idle';
      const elapsed = reducedMotion ? Infinity : clock.elapsed(String(index), status, now);
      mesh.setColorAt(index, statusColor(status, elapsed, light, NODE_COLOR).multiplyScalar(boost));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group {...group}>
      {glow > 0 ? (
        // The core lights its surroundings, so the glow travels with the sphere wherever it sits.
        <pointLight
          color={light ? '#e6bd7e' : '#ffb84f'}
          intensity={(light ? 3 : 7) * glow * s * s}
          distance={6 * s}
          decay={2}
        />
      ) : null}
      <group ref={coreRef}>
        <mesh>
          <sphereGeometry args={[radius, 64, 48]} />
          <shaderMaterial
            uniforms={marble}
            vertexShader={marbleVertexShader}
            fragmentShader={marbleFragmentShader}
          />
        </mesh>
        <mesh scale={1.025}>
          <sphereGeometry args={[radius, 36, 28]} />
          <shaderMaterial
            uniforms={{ uLightMode: { value: light ? 1 : 0 } }}
            vertexShader={rimVertexShader}
            fragmentShader={rimFragmentShader}
            transparent
            depthWrite={false}
            side={THREE.FrontSide}
          />
        </mesh>
        <lineSegments geometry={graph}>
          <lineBasicMaterial
            color={light ? '#9b6a32' : GOLD_HOT}
            transparent
            opacity={light ? 0.85 : 1}
            toneMapped={false}
          />
        </lineSegments>
        {nodes.length > 0 ? (
          <instancedMesh
            key={nodes.length}
            ref={nodeRef}
            args={[nodeGeometry, nodeMaterial, nodes.length]}
          />
        ) : null}
      </group>
      {beam ? (
        <>
          <mesh position={[0, -radius - 0.5 * s, 0]}>
            <cylinderGeometry args={[0.03 * s, 0.09 * s, 1 * s, 24, 1, true]} />
            <shaderMaterial
              uniforms={beamUniforms}
              vertexShader={beamVertexShader}
              fragmentShader={beamFragmentShader}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* The hot gold point where the beam meets the sphere; bloom spreads it into a glow. */}
          <mesh position={[0, -radius * 0.97, 0]}>
            <sphereGeometry args={[0.07 * s, 20, 14]} />
            <meshBasicMaterial color={light ? '#c08a3e' : GOLD_HOT} toneMapped={false} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
