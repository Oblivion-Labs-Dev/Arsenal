import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHeroEnv } from './shared';

/** Backdrop and fog colours per theme: the plate's near-black and its warm paper twin. */
export const HERO_BACKDROP = {
  dark: { base: '#050607', haze: '#3a2610', fog: '#07080a' },
  light: { base: '#efe7d8', haze: '#f7dcae', fog: '#ece3d2' },
} as const;

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // A full-screen quad pinned to the far plane, so it sits behind every piece.
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uBase;
  uniform vec3 uHaze;
  uniform vec2 uHazeAt;
  uniform float uShaft;
  uniform float uLightMode;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec3 color = uBase;
    // A warm pool of light behind the subject, as if the core lit the air around it.
    float pool = exp(-pow(distance(vUv * vec2(1.6, 1.0), uHazeAt * vec2(1.6, 1.0)) * 1.9, 2.0));
    color = mix(color, uHaze, pool * (uLightMode > 0.5 ? 0.55 : 0.85));
    // Soft god rays falling from the upper right.
    vec2 fromTop = vUv - vec2(0.78, 1.15);
    float angle = atan(fromTop.x, -fromTop.y);
    float rays = pow(max(0.0, sin(angle * 23.0) * 0.5 + 0.5), 6.0) * 0.6 + 0.4;
    float cone = smoothstep(0.42, 0.0, abs(angle + 0.38)) * smoothstep(0.0, 0.55, vUv.y);
    color += uHaze * cone * rays * uShaft;
    // Vignette, then a whisper of grain so the gradient never bands.
    float vignette = smoothstep(1.15, 0.25, length((vUv - 0.5) * vec2(1.25, 1.0)));
    color *= mix(uLightMode > 0.5 ? 0.9 : 0.55, 1.0, vignette);
    color += (hash(vUv * 1024.0) - 0.5) * (uLightMode > 0.5 ? 0.012 : 0.006);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface HeroBackdropProps {
  light?: boolean;
  /** Where the warm haze pools, in 0..1 screen space (y up). Default upper middle. */
  hazeAt?: readonly [number, number];
  /** Strength of the light shafts from the upper right; 0 removes them. Default 1. */
  shaft?: number;
  /** Matching distance fog. Default true. */
  fog?: boolean;
}

/**
 * The atmosphere behind the pieces: deep blue-black with a warm haze and faint light shafts in
 * dark mode, warm paper in light mode, plus matching fog. Never a flat fill.
 */
export function HeroBackdrop({
  light: lightProp,
  hazeAt = [0.56, 0.62],
  shaft = 1,
  fog = true,
}: HeroBackdropProps) {
  const { light } = useHeroEnv(lightProp);
  const scene = useThree((state) => state.scene);
  const palette = light ? HERO_BACKDROP.light : HERO_BACKDROP.dark;
  const uniforms = useMemo(
    () => ({
      uBase: { value: new THREE.Color() },
      uHaze: { value: new THREE.Color() },
      uHazeAt: { value: new THREE.Vector2() },
      uShaft: { value: 0 },
      uLightMode: { value: 0 },
    }),
    [],
  );
  uniforms.uBase.value.set(palette.base);
  uniforms.uHaze.value.set(palette.haze);
  uniforms.uHazeAt.value.set(hazeAt[0], hazeAt[1]);
  uniforms.uShaft.value = (light ? 0.05 : 0.07) * shaft;
  uniforms.uLightMode.value = light ? 1 : 0;

  useEffect(() => {
    if (!fog) return;
    const previous = scene.fog;
    scene.fog = new THREE.Fog(palette.fog, light ? 9 : 7, light ? 26 : 19);
    return () => {
      scene.fog = previous;
    };
  }, [fog, light, palette.fog, scene]);

  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
