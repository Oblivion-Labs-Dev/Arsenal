'use client';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useArsenalTheme, type PaletteMode } from '@arsenal/fx';
import { rgbToUnit, scenePalette, type SceneColorTheme } from './scene-palette';
import { MAX_SCENE_STEP, advanceIntro, useSceneFrameloop } from './scene-loop';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uCharge;
  varying vec3 vNormal;

  // Classic 3D noise function
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    float noise = snoise(position * 1.5 + uTime * 0.2);
    vec3 displaced = position + normal * (noise * 0.4 * (1.0 + uCharge * 0.5));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uCharge;
  uniform float uAdditive;
  uniform vec3 uCore;
  uniform vec3 uOuter;
  varying vec3 vNormal;

  void main() {
    vec3 color = mix(uCore, uOuter, min(uCharge * 2.0, 1.0));
    // View-space rim: lines facing the camera stay faint, the silhouette carries the light, so
    // the dense wireframe never stacks into a blown-out disc.
    float rim = pow(1.0 - abs(vNormal.z), 2.2);
    float pulse = 1.0 + (sin(uTime * 2.0) * 0.5 + 0.5) * 0.2;
    // Dark pages: additive light. Light pages: ink whose opacity follows the rim.
    vec4 glow = vec4(color * (0.05 + rim * 0.5) * pulse, 1.0);
    vec4 ink = vec4(color, clamp((0.08 + rim * 0.85) * pulse, 0.0, 0.85));
    gl_FragColor = mix(ink, glow, uAdditive);
  }
`;

export type GodSphereProps = {
  /** Spin and churn multiplier. Default 1. */
  speed?: number;
  /** Size multiplier. Default 1. */
  scale?: number;
  /** 0–1: blends from the core colour to the outer colour and swells the noise. Default 0. */
  charge?: number;
  /** Icosahedron subdivisions; lower is lighter. Default 64. */
  detail?: number;
  colorTheme?: SceneColorTheme;
  autoColor?: boolean;
  palette?: PaletteMode;
};

/**
 * The noise-displaced wireframe sphere, as a mesh for any R3F `<Canvas>`. It grows in from zero
 * on mount (instantly with reduced motion). Use `<AnomalyMatrix>` for a ready-made canvas.
 */
export function GodSphere({
  speed = 1,
  scale = 1,
  charge = 0,
  detail = 64,
  colorTheme = 'theme',
  autoColor = false,
  palette = 'auto',
  reduced = false,
}: GodSphereProps & { reduced?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const intro = useRef(reduced ? 1 : 0);
  const invalidate = useThree((state) => state.invalidate);
  const hue = useMemo(() => new THREE.Color(), []);
  const tokens = useArsenalTheme(palette);
  const colors = scenePalette(tokens, colorTheme);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCharge: { value: charge },
      uAdditive: { value: 1 },
      uCore: { value: new THREE.Color() },
      uOuter: { value: new THREE.Color() },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const key = `${colors.core.join()}|${colors.outer.join()}|${colors.additive}`;
  useEffect(() => {
    uniforms.uCore.value.setRGB(...rgbToUnit(colors.core));
    uniforms.uOuter.value.setRGB(...rgbToUnit(colors.outer));
    uniforms.uAdditive.value = colors.additive ? 1 : 0;
    invalidate();
  }, [key, invalidate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reduced) {
      intro.current = 1;
      uniforms.uCharge.value = charge;
    }
    mesh.current?.scale.setScalar(intro.current * scale);
    invalidate();
  }, [reduced, scale, charge, uniforms, invalidate]);

  useFrame((_, delta) => {
    if (reduced || !mesh.current) return;
    const step = Math.min(delta, MAX_SCENE_STEP);
    intro.current = advanceIntro(intro.current, delta);
    mesh.current.scale.setScalar(intro.current * scale);
    mesh.current.rotation.y += step * 0.1 * speed;
    mesh.current.rotation.z += step * 0.05 * speed;
    uniforms.uTime.value += step * speed;
    // Ease toward the target charge so changes never jump.
    uniforms.uCharge.value = THREE.MathUtils.damp(uniforms.uCharge.value, charge, 4, step);
    if (autoColor) {
      hue.setHSL((uniforms.uTime.value * 0.08) % 1, 0.85, colors.additive ? 0.55 : 0.4);
      uniforms.uCore.value.copy(hue);
      uniforms.uOuter.value.copy(hue);
    }
  });

  return (
    <mesh ref={mesh} scale={intro.current * scale}>
      <icosahedronGeometry args={[2.5, detail]} />
      <shaderMaterial
        key={colors.additive ? 'additive' : 'normal'}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        wireframe
        transparent
        depthWrite={!colors.additive}
        blending={colors.additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  );
}

export type AnomalyMatrixProps = GodSphereProps & {
  className?: string;
  style?: CSSProperties;
};

/**
 * The GodSphere in its own transparent canvas. Pauses off screen and in background tabs; with
 * reduced motion it renders one still frame.
 */
export function AnomalyMatrix({ className, style, ...sphere }: AnomalyMatrixProps) {
  const host = useRef<HTMLDivElement>(null);
  const { frameloop, reduced } = useSceneFrameloop(host);
  return (
    <div ref={host} className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 8], fov: 45 }}
        aria-hidden
      >
        <GodSphere {...sphere} reduced={reduced} />
      </Canvas>
    </div>
  );
}
