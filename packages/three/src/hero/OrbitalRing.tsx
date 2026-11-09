import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { heroTime, type HeroGroupProps, type HeroPieceProps, type Vec3, useHeroEnv } from "./shared";

/** A flat-ish torus band (or an arc of one, centred on +x) lying in the xz plane. */
export function makeBand(radius: number, width: number, thickness: number, span = Math.PI * 2) {
  const segments = span < Math.PI * 2 ? 40 : 192;
  const sides = 12;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const start = span < Math.PI * 2 ? -span * 0.5 : 0;
  for (let i = 0; i <= segments; i++) {
    const angle = start + (i / segments) * span;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let j = 0; j <= sides; j++) {
      const around = (j / sides) * Math.PI * 2;
      const radial = Math.cos(around) * width * 0.5;
      const vertical = Math.sin(around) * thickness * 0.5;
      positions.push((radius + radial) * cos, vertical, (radius + radial) * sin);
      // u runs along the band, v around its cross-section (0 and 0.5 are the outer and inner edge).
      uvs.push(i / segments, j / sides);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j;
      const b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const bandVertexShader = `
  varying vec2 vUv;
  varying float vAngle;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  void main() {
    vUv = uv;
    vAngle = atan(position.z, position.x);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDirection = cameraPosition - world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const bandFragmentShader = `
  uniform vec3 uGlass;
  uniform vec3 uGold;
  uniform float uHead;
  uniform float uStreak;
  uniform float uEdge;
  uniform float uBody;
  varying vec2 vUv;
  varying float vAngle;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  void main() {
    // Clear glass: nearly invisible face-on, catching light at grazing angles.
    float facing = abs(dot(normalize(vWorldNormal), normalize(vViewDirection)));
    float fresnel = pow(1.0 - facing, 3.0);
    // Thin bright gold lines along both edges of the ribbon.
    float edge = pow(abs(cos(vUv.y * 6.2832)), 28.0);
    // A comet of light: sharp head, long fading tail behind it.
    float behind = mod(uHead - vAngle, 6.2832);
    float comet = exp(-behind * 2.2) * uStreak;
    float shimmer = 0.75 + 0.25 * sin(vAngle * 7.0 + uHead * 2.0);
    vec3 color = uGlass * fresnel + uGold * (edge * uEdge * shimmer + comet * (0.5 + edge * 2.0));
    float alpha = clamp(uBody + fresnel * 0.4 + edge * uEdge * 0.9 + comet, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

/** Ring tilt in radians: about x, then z. Matches the ring group's `rotation={[x, 0, z]}`. */
export type RingTilt = readonly [number, number];

/**
 * Where `angle` on a ring of `radius` lands after the ring's tilt, relative to the ring centre.
 * Use it to put ServiceNodes (or anything) on an OrbitalRing.
 */
export function orbitPoint(radius: number, angle: number, tilt: RingTilt = [0, 0]): Vec3 {
  const [tx, tz] = tilt;
  // Euler XYZ applies z first, then x, to the flat point (r cos a, 0, r sin a).
  const px = Math.cos(angle) * radius;
  const pz = Math.sin(angle) * radius;
  const x = px * Math.cos(tz);
  const y = px * Math.sin(tz);
  return [x, y * Math.cos(tx) - pz * Math.sin(tx), y * Math.sin(tx) + pz * Math.cos(tx)];
}

/**
 * One glass orbital band with a warm light streak travelling around it, once per `period`
 * seconds (20–40s reads as calm). Independent: stack several with different tilts.
 */
export function OrbitalRing({
  radius = 2,
  tilt = [0, 0],
  period = 30,
  phase = 0,
  active = false,
  streak = true,
  bandWidth = 0.22,
  light: lightProp,
  reducedMotion: reducedProp,
  ...group
}: HeroGroupProps &
  HeroPieceProps & {
    radius?: number;
    tilt?: RingTilt;
    /** Seconds per revolution of the streak. */
    period?: number;
    /** Starting angle of the streak, radians. */
    phase?: number;
    /** Brighter, more opaque band (hover / selected). */
    active?: boolean;
    /** The travelling amber streak. Default true. */
    streak?: boolean;
    bandWidth?: number;
  }) {
  const { light, reducedMotion } = useHeroEnv(lightProp, reducedProp);
  const lightMode = light;
  const band = useMemo(() => makeBand(radius, bandWidth, bandWidth * 0.18), [radius, bandWidth]);
  useEffect(() => () => band.dispose(), [band]);
  const uniforms = useMemo(
    () => ({
      uGlass: { value: new THREE.Color() },
      uGold: { value: new THREE.Color() },
      uHead: { value: 0 },
      uStreak: { value: 0 },
      uEdge: { value: 0 },
      uBody: { value: 0 },
    }),
    [],
  );
  uniforms.uGlass.value.set(lightMode ? "#8a7a62" : "#c9d6d8");
  uniforms.uGold.value.set(lightMode ? "#8f5e26" : "#ffc766").multiplyScalar(lightMode ? 1 : 1.6);
  uniforms.uStreak.value = streak ? (lightMode ? 0.7 : 1.4) : 0;
  uniforms.uEdge.value = (lightMode ? 0.55 : 0.7) * (active ? 1.5 : 1);
  uniforms.uBody.value = lightMode ? 0.06 : 0.04;

  useFrame((frame) => {
    const time = heroTime(frame.clock.elapsedTime, reducedMotion);
    uniforms.uHead.value =
      phase + (reducedMotion ? 0.14 : (time / Math.max(period, 0.001)) * Math.PI * 2);
  });

  return (
    <group {...group}>
      <group rotation={[tilt[0], 0, tilt[1]]}>
        <mesh geometry={band}>
          <shaderMaterial
            vertexShader={bandVertexShader}
            fragmentShader={bandFragmentShader}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
