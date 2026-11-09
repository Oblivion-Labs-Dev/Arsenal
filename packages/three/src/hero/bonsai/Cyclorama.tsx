import { useMemo } from 'react';
import type { Ref } from 'react';
import * as THREE from 'three';
import { useHeroEnv } from '../shared';

export function buildCycloramaGeometry(): THREE.LatheGeometry {
  const points: THREE.Vector2[] = [new THREE.Vector2(0, -0.5), new THREE.Vector2(4.5, -0.5)];
  const radius = 1.5;
  const steps = 32;
  for (let i = 1; i <= steps; i += 1) {
    const theta = (Math.PI / 2) * (i / steps);
    points.push(new THREE.Vector2(4.5 + radius * Math.sin(theta), -0.5 + radius * (1 - Math.cos(theta))));
  }
  points.push(new THREE.Vector2(6, 6));
  return new THREE.LatheGeometry(points, 96);
}

const vertexShader = `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uBase;
  uniform vec3 uPool;
  uniform float uLight;
  varying vec3 vLocal;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float floorPart = 1.0 - smoothstep(0.02, 0.45, vLocal.y + 0.08);
    float radial = exp(-dot(vLocal.xz, vLocal.xz) / 5.5);
    float pool = floorPart * radial * (uLight > 0.5 ? 0.34 : 0.42);
    float wallFade = smoothstep(0.0, 5.5, vLocal.y);
    vec3 color = mix(uBase, uPool, pool);
    color *= mix(1.0, uLight > 0.5 ? 0.88 : 0.62, wallFade);
    color += (hash(gl_FragCoord.xy) - 0.5) * 0.003;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface CycloramaProps { objectRef?: Ref<THREE.Group>; }

export function Cyclorama({ objectRef }: CycloramaProps) {
  const { light } = useHeroEnv();
  const geometry = useMemo(buildCycloramaGeometry, []);
  const uniforms = useMemo(() => ({
    uBase: { value: new THREE.Color() }, uPool: { value: new THREE.Color() }, uLight: { value: 0 },
  }), []);
  uniforms.uBase.value.set(light ? '#efe7d8' : '#0d0e10');
  uniforms.uPool.value.set(light ? '#f7dcae' : '#3a2610');
  uniforms.uLight.value = light ? 1 : 0;
  return <group ref={objectRef}>
    <mesh geometry={geometry} receiveShadow>
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} side={THREE.BackSide} />
    </mesh>
    <mesh rotation-x={-Math.PI / 2} position-y={-0.497} receiveShadow>
      <planeGeometry args={[12, 12]} />
      <shadowMaterial transparent opacity={light ? 0.18 : 0.3} />
    </mesh>
  </group>;
}
