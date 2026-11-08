'use client';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useArsenalTheme, type PaletteMode } from '@arsenal/fx';
import { createAccretionDisk } from './accretion-disk';
import { rgbToUnit, scenePalette, type SceneColorTheme } from './scene-palette';
import { MAX_SCENE_STEP, useSceneFrameloop } from './scene-loop';

export type GravityWellProps = {
  /** Disk particles. Default 2000. */
  particleCount?: number;
  /** Orbit speed multiplier. Default 1. */
  diskSpeed?: number;
  /** `theme` (default) follows the page tokens; presets keep the portfolio looks. */
  colorTheme?: SceneColorTheme;
  /** Slowly cycle the disk through the spectrum. */
  autoColor?: boolean;
  palette?: PaletteMode;
  seed?: number;
  className?: string;
  style?: CSSProperties;
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSpeed;
  varying float vDistance;
  void main() {
    float a = aSpeed * uTime;
    float c = cos(a);
    float s = sin(a);
    vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
    vDistance = length(p.xz);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (30.0 / -mvPosition.z) * (1.0 + sin(uTime * 2.0 + p.x) * 0.2) * uPixelRatio;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uOuter;
  uniform float uStrength;
  uniform float uHot;
  varying float vDistance;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float t = smoothstep(1.2, 5.7, vDistance);
    vec3 color = mix(uCore, uOuter, t);
    // The inner edge runs white-hot on dark surfaces.
    color = mix(color, vec3(1.0), uHot * (1.0 - smoothstep(1.2, 2.2, vDistance)) * 0.55);
    float falloff = exp(-d * d * 18.0);
    float alpha = falloff * min(1.0, uStrength / (vDistance * 0.45));
    gl_FragColor = vec4(color, alpha);
  }
`;

type DiskProps = Required<Pick<GravityWellProps, 'particleCount' | 'diskSpeed' | 'autoColor' | 'seed'>> & {
  core: [number, number, number];
  outer: [number, number, number];
  additive: boolean;
  reduced: boolean;
};

function AccretionDisk({ particleCount, diskSpeed, autoColor, seed, core, outer, additive, reduced }: DiskProps) {
  const invalidate = useThree((state) => state.invalidate);
  const hue = useMemo(() => new THREE.Color(), []);
  const disk = useMemo(
    () => createAccretionDisk({ count: particleCount, speed: diskSpeed, seed }),
    [particleCount, diskSpeed, seed],
  );
  const uniforms = useMemo(
    () => ({
      // A still frame shows the arms already wound, not the seed layout.
      uTime: { value: 6 },
      uPixelRatio: { value: 1 },
      uCore: { value: new THREE.Color() },
      uOuter: { value: new THREE.Color() },
      uStrength: { value: 0.85 },
      uHot: { value: 1 },
    }),
    [],
  );

  useEffect(() => {
    uniforms.uCore.value.setRGB(...core);
    uniforms.uOuter.value.setRGB(...outer);
    uniforms.uStrength.value = additive ? 0.85 : 1.4;
    uniforms.uHot.value = additive ? 1 : 0;
    // On-demand (paused or reduced) scenes repaint the still frame with the new palette.
    invalidate();
  }, [uniforms, core, outer, additive, invalidate]);

  useFrame((state, delta) => {
    uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    if (reduced) return;
    const step = Math.min(delta, MAX_SCENE_STEP);
    uniforms.uTime.value += step;
    if (autoColor) {
      hue.setHSL((uniforms.uTime.value * 0.08) % 1, 0.85, additive ? 0.55 : 0.4);
      uniforms.uCore.value.copy(hue);
      uniforms.uOuter.value.copy(hue).offsetHSL(0.12, 0, 0);
    }
  });

  return (
    <points>
      <bufferGeometry key={`${particleCount}-${diskSpeed}-${seed}`}>
        <bufferAttribute attach="attributes-position" args={[disk.positions, 3]} />
        <bufferAttribute attach="attributes-aSpeed" args={[disk.speeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        key={additive ? 'additive' : 'normal'}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}

const ringVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    // Plane spans radius 0..2.2 in world units; the horizon sits at 1.0.
    float r = length(vUv - 0.5) * 4.4;
    float ring = exp(-pow((r - 1.08) * 9.0, 2.0));
    float halo = exp(-max(r - 1.0, 0.0) * 2.6) * step(1.0, r);
    float a = (ring * 0.9 + halo * 0.35) * uStrength;
    gl_FragColor = vec4(uColor, a);
  }
`;

/** A camera-facing photon ring and halo, so the horizon reads against the disk. */
function PhotonRing({ color, additive }: { color: [number, number, number]; additive: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color() }, uStrength: { value: 1 } }), []);
  useEffect(() => {
    uniforms.uColor.value.setRGB(...color);
    uniforms.uStrength.value = additive ? 0.9 : 0.55;
    mesh.current?.quaternion.copy(camera.quaternion);
    invalidate();
  }, [uniforms, color, additive, camera, invalidate]);
  return (
    <mesh ref={mesh}>
      <planeGeometry args={[4.4, 4.4]} />
      <shaderMaterial
        key={additive ? 'additive' : 'normal'}
        vertexShader={ringVertex}
        fragmentShader={ringFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
}

/**
 * A black hole with a Keplerian two-armed accretion disk. The orbit runs in the vertex shader, so
 * the CPU does no per-frame work. Transparent: it sits on whatever surface you give it. Pauses
 * off screen and in background tabs; with reduced motion it renders one still frame.
 */
export function GravityWell({
  particleCount = 2000,
  diskSpeed = 1,
  colorTheme = 'theme',
  autoColor = false,
  palette = 'auto',
  seed = 7,
  className,
  style,
}: GravityWellProps) {
  const host = useRef<HTMLDivElement>(null);
  const { frameloop, reduced } = useSceneFrameloop(host);
  const tokens = useArsenalTheme(palette);
  const colors = scenePalette(tokens, colorTheme);
  const core = useMemo(() => rgbToUnit(colors.core), [colors.core.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const outer = useMemo(() => rgbToUnit(colors.outer), [colors.outer.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const voidColor = useMemo(() => new THREE.Color(...rgbToUnit(colors.void)), [colors.void.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={host} className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 2.3, 6.6], fov: 42 }}
        aria-hidden
      >
        <mesh>
          <sphereGeometry args={[1, 48, 48]} />
          <meshBasicMaterial color={voidColor} />
        </mesh>
        <PhotonRing color={core} additive={colors.additive} />
        <AccretionDisk
          particleCount={particleCount}
          diskSpeed={diskSpeed}
          autoColor={autoColor}
          seed={seed}
          core={core}
          outer={outer}
          additive={colors.additive}
          reduced={reduced}
        />
      </Canvas>
    </div>
  );
}
