import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heroTime, type HeroGroupProps, type HeroPieceProps, useHeroEnv } from './shared';

const sheetVertex = `
  uniform float uBow;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    // The water leaves the lip forward, then drops: a soft outward bow, strongest mid-fall.
    float fall = 1.0 - uv.y;
    p.z += uBow * sin(fall * 3.1416 * 0.85) + uBow * 0.35 * fall;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const sheetFragment = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uGap;
  uniform float uDensity;
  uniform vec3 uWater;
  uniform vec3 uFoam;
  varying vec2 vUv;
  float hash(float n) { return fract(sin(n * 91.345) * 47453.21); }
  void main() {
    // Narrow silky strands: each column gets its own brightness, width and fall speed.
    float columns = 26.0;
    float column = floor(vUv.x * columns);
    float local = fract(vUv.x * columns);
    float seed = hash(column);
    float strand = smoothstep(0.5, 0.0, abs(local - 0.5) - seed * 0.18);
    float flow = vUv.y * (10.0 + seed * 9.0) + uTime * (1.4 + seed * 1.6) + seed * 40.0;
    float pulse = 0.55 + 0.45 * sin(flow) * sin(flow * 0.37 + 1.3);
    float body = strand * (0.35 + 0.65 * seed) * pulse;
    // Gaps between strands stay faintly filled, so the fall reads as one silky sheet.
    float sheet = uGap + body * (1.0 - uGap);
    // Wide soft sides and a gentle top lip, so the fall melts into the rock instead of a hard card.
    float sides = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
    float lip = smoothstep(1.0, 0.85, vUv.y);
    float foam = smoothstep(0.16, 0.0, vUv.y) * (0.6 + 0.4 * seed);
    vec3 color = mix(uWater, uFoam, clamp(body * 0.8 + foam * 0.5, 0.0, 1.0));
    float alpha = sides * lip * (sheet * uDensity + foam * 0.3) * uOpacity;
    gl_FragColor = vec4(color * (1.0 + foam * 0.25), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const mistVertex = `
  uniform float uTime;
  uniform float uSize;
  attribute vec3 seed;
  varying float vFade;
  void main() {
    // Each droplet drifts up and out from the landing point, then fades and starts over.
    float life = fract(uTime * (0.06 + seed.x * 0.08) + seed.y);
    vec3 p = position;
    p.x += (seed.z - 0.5) * life * 0.5;
    p.y += life * 0.28;
    p.z += life * 0.18;
    vFade = smoothstep(0.0, 0.2, life) * smoothstep(1.0, 0.55, life);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.6 + seed.x) * (1.0 + life) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const mistFragment = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float soft = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, soft * soft * vFade * uOpacity);
    #include <colorspace_fragment>
  }
`;

const MIST_COUNT = 70;

export type WaterfallProps = HeroGroupProps &
  HeroPieceProps & {
    width?: number;
    height?: number;
    /** Flow speed multiplier. */
    speed?: number;
    opacity?: number;
    /** How far the sheet bows out from the cliff face. Default 0.08. */
    bow?: number;
    /** Drifting mist where it lands. Default true. */
    mist?: boolean;
  };

/**
 * One waterfall: silky white strands falling at their own pace, bowing out from the lip, turning
 * to foam at the base where soft mist drifts up. The group origin is the lip; the sheet hangs
 * `height` below it.
 */
export function Waterfall({
  light: lightProp,
  reducedMotion: reducedProp,
  width = 0.5,
  height = 1.16,
  speed = 1,
  opacity = 1,
  bow = 0.08,
  mist = true,
  ...group
}: WaterfallProps) {
  const { light, reducedMotion } = useHeroEnv(lightProp, reducedProp);
  const sheetUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uBow: { value: 0 },
      uGap: { value: 0.16 },
      uDensity: { value: 0.75 },
      uWater: { value: new THREE.Color() },
      uFoam: { value: new THREE.Color() },
    }),
    [],
  );
  const mistUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color() },
    }),
    [],
  );
  const mistGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MIST_COUNT * 3);
    const seeds = new Float32Array(MIST_COUNT * 3);
    let state = 7;
    const random = () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
    for (let index = 0; index < MIST_COUNT; index++) {
      positions[index * 3] = (random() - 0.5) * width * 1.1;
      positions[index * 3 + 1] = -height + random() * 0.06;
      positions[index * 3 + 2] = bow * 1.35 + random() * 0.05;
      seeds.set([random(), random(), random()], index * 3);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
    return geometry;
  }, [width, height, bow]);
  useEffect(() => () => mistGeometry.dispose(), [mistGeometry]);

  sheetUniforms.uOpacity.value = opacity;
  sheetUniforms.uBow.value = bow;
  // On paper a thin translucent sheet vanishes, so light mode fills the gaps and thickens it.
  sheetUniforms.uGap.value = light ? 0.5 : 0.16;
  sheetUniforms.uDensity.value = light ? 1.25 : 0.75;
  sheetUniforms.uWater.value.set(light ? '#2c4651' : '#5f7885');
  sheetUniforms.uFoam.value.set(light ? '#8fa8ad' : '#f4f8f8');
  mistUniforms.uSize.value = 34 * width;
  mistUniforms.uOpacity.value = (light ? 0.35 : 0.42) * opacity;
  mistUniforms.uColor.value.set(light ? '#9fb1b1' : '#cfdcdf');

  useFrame((frame) => {
    const time = heroTime(frame.clock.elapsedTime, reducedMotion, 3.2) * speed;
    sheetUniforms.uTime.value = time;
    mistUniforms.uTime.value = time;
  });

  const segments = Math.max(6, Math.round(24 * (height / 1.16)));
  return (
    <group {...group}>
      <mesh position={[0, -height / 2, 0]}>
        <planeGeometry args={[width, height, 1, segments]} />
        <shaderMaterial
          vertexShader={sheetVertex}
          fragmentShader={sheetFragment}
          uniforms={sheetUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {mist ? (
        <points geometry={mistGeometry} frustumCulled={false}>
          <shaderMaterial
            vertexShader={mistVertex}
            fragmentShader={mistFragment}
            uniforms={mistUniforms}
            transparent
            depthWrite={false}
          />
        </points>
      ) : null}
    </group>
  );
}
