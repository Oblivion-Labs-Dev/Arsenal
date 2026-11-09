import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  heroTime,
  type HeroGroupProps,
  type HeroPieceProps,
  type HeroQuality,
  useHeroEnv,
} from './shared';

type WindShader = { uniforms: { uWindTime: { value: number }; uWind: { value: number } } };

const PAD_LAYOUT = [
  [-0.55, 0.98, 0.02, 0.42, 0.13, 0.28],
  [-0.04, 1.01, 0, 0.45, 0.14, 0.3],
  [0.47, 1.04, -0.02, 0.38, 0.13, 0.26],
  [-0.42, 1.29, 0.01, 0.45, 0.14, 0.29],
  [0.12, 1.32, -0.02, 0.48, 0.15, 0.3],
  [0.58, 1.36, -0.03, 0.34, 0.13, 0.24],
  [-0.25, 1.6, 0.02, 0.41, 0.14, 0.28],
  [0.2, 1.64, -0.02, 0.43, 0.14, 0.27],
  [0.27, 1.9, -0.01, 0.3, 0.11, 0.22],
] as const;
const LEAF_DARK = ['#1d270b', '#2a3810', '#3a4a15', '#52631c', '#78882a'];
const LEAF_LIGHT = ['#2f3d14', '#3f5119', '#52661f', '#687d28', '#7f9233'];
/** Leaf clumps per pad: many small lumps read as foliage where one sphere reads as a cloud. */
const CLUMPS_PER_PAD = 16;

/** A tube whose radius follows `taper(t)` along the curve (t 0 at the root, 1 at the tip). */
function taperedTube(
  curve: THREE.Curve<THREE.Vector3>,
  segments: number,
  radius: number,
  radial: number,
  taper: (t: number) => number,
) {
  const tube = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const position = tube.attributes.position;
  const centre = new THREE.Vector3();
  const vertex = new THREE.Vector3();
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments;
    curve.getPointAt(t, centre);
    for (let side = 0; side <= radial; side++) {
      const index = ring * (radial + 1) + side;
      vertex.fromBufferAttribute(position, index).sub(centre).multiplyScalar(taper(t)).add(centre);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  tube.computeVertexNormals();
  return tube;
}

function makeBranches() {
  const curves: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.1, 0.35, 0.02),
    new THREE.Vector3(0.06, 0.74, -0.02),
    new THREE.Vector3(0.24, 1.1, 0.03),
    new THREE.Vector3(0.11, 1.47, 0.02),
    new THREE.Vector3(0.31, 1.79, 0.04),
  ]);
  // Gnarled: wide root flare, quick taper, a little knotting along the way.
  curves.push(
    taperedTube(trunk, 64, 0.1, 10, (t) => 0.42 + 1.25 * Math.exp(-t * 9) + 0.5 * (1 - t) + Math.sin(t * 23) * 0.05),
  );
  const branches = [
    [
      [-0.02, 0.53, 0],
      [-0.36, 0.72, 0.03],
      [-0.72, 0.91, 0.02],
    ],
    [
      [0.04, 0.71, 0],
      [0.34, 0.88, -0.04],
      [0.72, 1.02, -0.08],
    ],
    [
      [0.11, 0.91, 0],
      [-0.2, 1.12, 0.03],
      [-0.54, 1.28, 0.01],
    ],
    [
      [0.19, 1.16, 0],
      [0.52, 1.35, -0.04],
      [0.82, 1.44, -0.05],
    ],
    [
      [0.17, 1.4, 0],
      [-0.08, 1.57, 0.01],
      [-0.4, 1.64, 0.03],
    ],
    [
      [0.23, 1.56, 0],
      [0.48, 1.69, -0.03],
      [0.68, 1.79, -0.04],
    ],
  ];
  for (let index = 0; index < branches.length; index++) {
    const curve = new THREE.CatmullRomCurve3(
      branches[index].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    );
    curves.push(taperedTube(curve, 18, 0.034 - index * 0.0022, 6, (t) => 1.25 - t * 0.7));
  }
  const merged = mergeGeometries(curves, false);
  curves.forEach((geometry) => geometry.dispose());
  if (!merged) throw new Error('Could not merge hero bonsai branches');
  return merged;
}

/** Adds the foliage sway to a standard vertex shader. Every uniform it reads is declared here. */
export function patchBonsaiWind(vertexShader: string): string {
  return vertexShader
    .replace(
      '#include <common>',
      '#include <common>\nuniform float uWindTime;\nuniform float uWind;',
    )
    .replace(
      '#include <begin_vertex>',
      [
        '#include <begin_vertex>',
        '#ifdef USE_INSTANCING',
        'float windHeight = instanceMatrix[3].y;',
        'float windScale = max(length(instanceMatrix[0].xyz), 0.001);',
        '#else',
        'float windHeight = position.y;',
        'float windScale = 1.0;',
        '#endif',
        // Higher clumps sway more, each pad slightly out of step with the next.
        'transformed.x += sin(uWindTime * 0.7 + windHeight * 2.3) * 0.05 * uWind * max(windHeight - 0.8, 0.0) / windScale;',
      ].join('\n'),
    );
}

/** Foliage pads drawn at a quality level (the layout has 9). */
export function bonsaiPadCount(quality: HeroQuality): number {
  return quality === 'high' ? 9 : quality === 'medium' ? 7 : 5;
}

function foliageInstances(pads: number, lightMode: boolean) {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.86 });
  const mesh = new THREE.InstancedMesh(geometry, material, pads * CLUMPS_PER_PAD);
  const dummy = new THREE.Object3D();
  const palette = lightMode ? LEAF_LIGHT : LEAF_DARK;
  const tint = new THREE.Color();
  let state = 11;
  const random = () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
  for (let pad = 0; pad < pads; pad++) {
    const [x, y, z, sx, sy, sz] = PAD_LAYOUT[pad];
    for (let clump = 0; clump < CLUMPS_PER_PAD; clump++) {
      const index = pad * CLUMPS_PER_PAD + clump;
      // Spread over a flattened dome: wide and level underneath, mounded on top, like a cloud pad.
      const angle = random() * Math.PI * 2;
      const reach = Math.sqrt(random()) * 0.92;
      const lift = (1 - reach * reach) * 0.85 + (random() - 0.4) * 0.3;
      dummy.position.set(x + Math.cos(angle) * sx * reach, y + sy * lift, z + Math.sin(angle) * sz * reach);
      const size = (0.075 + random() * 0.07) * (0.7 + sx);
      dummy.scale.set(size * 1.2, size * 0.8, size * 1.2);
      dummy.rotation.set(random() * 3, random() * 3, random() * 3);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      // Sunlit tops are brighter yellow-green, undersides fall into deep olive.
      const shade = Math.min(palette.length - 1, Math.max(0, Math.round(lift * 3 + random() * 1.4)));
      mesh.setColorAt(index, tint.set(palette[shade]));
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/**
 * The original lightweight bonsai, kept as a fallback for weak devices and the island hero: one
 * merged trunk-and-branch tube mesh and layered foliage pads that sway in a
 * shader wind (6–12s feel), the whole tree rocking a hair on a 9s cycle. Root sits at the origin.
 */
export function BonsaiTreeLite({
  quality = 'high',
  reducedMotion: reducedProp,
  light: lightProp,
  wind = 1,
  ...group
}: HeroGroupProps &
  HeroPieceProps & {
    quality?: HeroQuality;
    /** Wind strength multiplier; 0 holds the canopy still. */
    wind?: number;
  }) {
  const { light, reducedMotion } = useHeroEnv(lightProp, reducedProp);
  const lightMode = light;
  const treeRef = useRef<THREE.Group>(null);
  const shaderRef = useRef<WindShader | null>(null);
  const branches = useMemo(makeBranches, []);
  const foliageCount = bonsaiPadCount(quality);
  const foliage = useMemo(
    () => foliageInstances(foliageCount, lightMode),
    [foliageCount, lightMode],
  );
  const foliageMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.82,
      flatShading: true,
      // A faint self-glow keeps the canopy readable against the dark backdrop, as in the plate.
      emissive: new THREE.Color('#2a3208'),
      emissiveIntensity: 0.22,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWindTime = { value: 0 };
      shader.uniforms.uWind = { value: 1 };
      shaderRef.current = shader as unknown as WindShader;
      shader.vertexShader = patchBonsaiWind(shader.vertexShader);
    };
    material.customProgramCacheKey = () => 'arsenal-bonsai-wind-v3';
    return material;
  }, []);

  useEffect(() => () => branches.dispose(), [branches]);
  useEffect(
    () => () => {
      foliage.geometry.dispose();
      (foliage.material as THREE.Material).dispose();
      foliage.dispose();
    },
    [foliage],
  );
  useEffect(() => () => foliageMaterial.dispose(), [foliageMaterial]);

  useFrame((frame) => {
    const time = heroTime(frame.clock.elapsedTime, reducedMotion);
    if (shaderRef.current) {
      shaderRef.current.uniforms.uWindTime.value = time;
      shaderRef.current.uniforms.uWind.value = wind;
    }
    if (treeRef.current) {
      treeRef.current.rotation.z = Math.sin((time * Math.PI * 2) / 9) * 0.004 * wind;
    }
  });

  return (
    <group {...group}>
      <group ref={treeRef} scale={[0.92, 1, 0.92]}>
        <mesh geometry={branches} castShadow>
          <meshStandardMaterial
            color={lightMode ? '#6a5139' : '#3a2a1c'}
            roughness={0.88}
            metalness={0.02}
          />
        </mesh>
        <primitive object={foliage} material={foliageMaterial} castShadow />
      </group>
    </group>
  );
}
