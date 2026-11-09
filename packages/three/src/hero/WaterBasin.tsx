import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { heroTime, type HeroGroupProps, type HeroPieceProps, type Vec3, useHeroEnv } from './shared';

/** Most ripple sources the water shader draws. */
export const MAX_RIPPLES = 4;
/** Rings alive per source at once. */
const RING_FRONTS = 3;

/** Ripple growth for phase 0..1: scale and colour fade. */
export function rippleAt(phase: number): { scale: number; fade: number } {
  const p = Math.min(Math.max(phase, 0), 1);
  return { scale: 0.45 + p * 2.5, fade: 1 - p };
}

export type WaterBasinProps = HeroGroupProps &
  HeroPieceProps & {
    /** Width and depth of the water plane. Default [22, 12]. */
    size?: readonly [number, number];
    /** Where rings spread from, in the basin's local xz (y is ignored). Up to 4. Default the centre. */
    ripples?: readonly Vec3[];
    /** Seconds between rings leaving a source. The reference reads calm at 4–8. Default 6.3. */
    ripplePeriod?: number;
    /** Mirror texture size in px. Lower is cheaper. Default 512. */
    resolution?: number;
    /** How far a ring travels before it fades out. Default 0.42 × the shorter side. */
    rippleReach?: number;
  };

const vertexShader = `
  uniform mat4 textureMatrix;
  varying vec4 vUv;
  varying vec2 vLocal;
  varying vec3 vWorld;
  void main() {
    vUv = textureMatrix * vec4(position, 1.0);
    vLocal = position.xy;
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec3 color;
  uniform vec3 uDeep;
  uniform vec3 uRipple;
  uniform vec2 uSize;
  uniform vec2 uCenters[${MAX_RIPPLES}];
  uniform int uCount;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uReflect;
  uniform float uReach;
  uniform float uInk;
  varying vec4 vUv;
  varying vec2 vLocal;
  varying vec3 vWorld;
  void main() {
    float rings = 0.0;
    vec2 bend = vec2(0.0);
    // Each source sends out one thin ring per period; ${RING_FRONTS} are alive at once, each growing
    // to uReach over its life and fading as it goes, so the surface stays mostly still.
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      if (i >= uCount) break;
      vec2 delta = vLocal - uCenters[i];
      float d = length(delta);
      vec2 dir = delta / max(d, 1e-4);
      for (int k = 0; k < ${RING_FRONTS}; k++) {
        float age = fract(uTime * uSpeed / ${RING_FRONTS}.0 + (float(k) + float(i) * 0.37) / ${RING_FRONTS}.0);
        float radius = 0.12 + age * uReach;
        float x = (d - radius) / (0.025 + age * 0.03);
        float fade = smoothstep(0.0, 0.06, age) * pow(1.0 - age, 1.6);
        float crest = exp(-x * x);
        // A fainter trailing ring just inside the crest, like a real ripple train.
        float trail = exp(-pow(x + 3.2, 2.0)) * 0.4;
        rings += (crest + trail) * fade;
        bend += dir * (-2.0 * x * crest) * fade;
      }
    }
    vec3 view = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - clamp(view.y, 0.0, 1.0), 2.4);
    vec4 uv = vUv;
    uv.xy += bend * 0.006 * uv.w;
    vec3 mirror = texture2DProj(tDiffuse, uv).rgb;
    vec3 water = uDeep + mirror * mix(uReflect * 0.55, uReflect, fresnel);
    float ringAmount = rings * (0.07 + 0.16 * fresnel);
    // Dark water glows where a ring passes; pale water darkens instead, like ink on paper.
    water = mix(water + uRipple * ringAmount, mix(water, uRipple, clamp(ringAmount * 2.2, 0.0, 1.0)), uInk);
    vec2 edge = min(vLocal + uSize * 0.5, uSize * 0.5 - vLocal) / (uSize * 0.5);
    float alpha = smoothstep(0.0, 0.32, min(edge.x, edge.y));
    gl_FragColor = vec4(water, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * Still dark water: a real mirror of the scene above (bent by the ripples) over a deep tone,
 * with thin amber rings spreading slowly from each ripple source. Edges fade into the backdrop.
 */
export function WaterBasin({
  size = [22, 12],
  ripples = [[0, 0, 0]],
  ripplePeriod = 6.3,
  resolution = 512,
  rippleReach,
  light: lightProp,
  reducedMotion: reducedProp,
  ...group
}: WaterBasinProps) {
  const { light, reducedMotion } = useHeroEnv(lightProp, reducedProp);
  const [width, depth] = size;
  const mirror = useMemo(() => {
    const reflector = new Reflector(new THREE.PlaneGeometry(width, depth), {
      textureWidth: resolution,
      textureHeight: Math.round(resolution * Math.min(1, depth / width + 0.25)),
      clipBias: 0.003,
      shader: {
        name: 'ArsenalHeroWater',
        uniforms: {
          color: { value: null },
          tDiffuse: { value: null },
          textureMatrix: { value: null },
          uDeep: { value: new THREE.Color() },
          uRipple: { value: new THREE.Color() },
          uSize: { value: new THREE.Vector2(width, depth) },
          uCenters: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector2()) },
          uCount: { value: 0 },
          uTime: { value: 0 },
          uSpeed: { value: 0.16 },
          uReflect: { value: 0.8 },
          uReach: { value: 2 },
          uInk: { value: 0 },
        },
        vertexShader,
        fragmentShader,
      },
    });
    const material = reflector.material as THREE.ShaderMaterial;
    material.transparent = true;
    material.depthWrite = false;
    reflector.rotation.x = -Math.PI / 2;
    reflector.renderOrder = -1;
    return reflector;
  }, [width, depth, resolution]);
  useEffect(() => () => mirror.dispose(), [mirror]);

  const uniforms = (mirror.material as THREE.ShaderMaterial).uniforms;
  uniforms.uDeep.value.set(light ? '#bdb2a0' : '#030405');
  uniforms.uRipple.value.set(light ? '#8a5a22' : '#ffae3d');
  uniforms.uReflect.value = light ? 0.42 : 0.85;
  uniforms.uInk.value = light ? 1 : 0;
  uniforms.uSpeed.value = 1 / Math.max(ripplePeriod, 0.5);
  uniforms.uReach.value = rippleReach ?? Math.min(width, depth) * 0.42;
  uniforms.uCount.value = Math.min(ripples.length, MAX_RIPPLES);
  for (let index = 0; index < MAX_RIPPLES; index++) {
    const at = ripples[index];
    // The plane is turned flat, so its local y runs along world -z.
    if (at) uniforms.uCenters.value[index].set(at[0], -at[2]);
  }

  useFrame((frame) => {
    uniforms.uTime.value = heroTime(frame.clock.elapsedTime, reducedMotion, 2.4);
  });

  return (
    <group {...group}>
      <primitive object={mirror} />
    </group>
  );
}
