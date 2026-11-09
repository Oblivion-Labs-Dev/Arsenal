import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gaussianWeights } from './studio-math';

/** Studio floor height the contact shadow sits on. */
export const CONTACT_SHADOW_GROUND = -0.5;

/** Occupancy pass vertex shader: honours instancing so instanced leaves and stones cast too. */
export const OCCUPANCY_VERTEX = /* glsl */ `
varying float vHeight;
void main() {
  vec4 local = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
  #endif
  vec4 world = modelMatrix * local;
  vHeight = world.y;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const OCCUPANCY_FRAGMENT = /* glsl */ `
uniform float uFar;
uniform float uGround;
varying float vHeight;
void main() {
  float a = 1.0 - smoothstep(0.0, uFar, max(vHeight - uGround, 0.0));
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}
`;

const BLUR_VERTEX = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BLUR_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform vec2 uStep;
uniform float uWeights[5];
varying vec2 vUv;
void main() {
  vec4 color = texture2D(uMap, vUv) * uWeights[0];
  for (int i = 1; i < 5; i++) {
    vec2 offset = uStep * float(i);
    color += (texture2D(uMap, vUv + offset) + texture2D(uMap, vUv - offset)) * uWeights[i];
  }
  gl_FragColor = color;
}
`;

/**
 * Point the shadow camera up at the floor from below, its frustum exactly covering the shadow
 * plane (`size` wide). Seen from below the image is mirrored in x; the plane undoes that with
 * `CONTACT_SHADOW_PLANE_SCALE`.
 */
export function aimContactShadowCamera(
  camera: THREE.OrthographicCamera,
  size: number,
  ground = CONTACT_SHADOW_GROUND,
): void {
  const half = size / 2;
  camera.left = -half;
  camera.right = half;
  camera.top = half;
  camera.bottom = -half;
  camera.near = 0.01;
  camera.far = 12;
  camera.position.set(0, ground - 4.5, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, ground, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

/** Plane transform that shows the render target the right way round on the floor. */
export const CONTACT_SHADOW_PLANE_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];
export const CONTACT_SHADOW_PLANE_SCALE: [number, number, number] = [-1, 1, 1];

export interface ContactShadowProps {
  cyclorama?: RefObject<THREE.Group | null>;
  opacity?: number;
  blur?: number;
  /** Height above the floor over which occupancy fades to nothing. */
  far?: number;
  size?: number;
  /** Re-render every N frames. */
  frames?: number;
  resolution?: number;
  ground?: number;
}

/** A hand-rendered, height-faded occupancy shadow, blurred with separable full-screen passes. */
export function ContactShadow({
  cyclorama,
  opacity = 0.5,
  blur = 3,
  far = 1,
  size = 2.6,
  frames = 1,
  resolution = 512,
  ground = CONTACT_SHADOW_GROUND,
}: ContactShadowProps) {
  const { gl, scene } = useThree();
  const plane = useRef<THREE.Mesh>(null);
  const camera = useMemo(() => new THREE.OrthographicCamera(), []);
  const occupancy = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uFar: { value: far }, uGround: { value: ground } },
        vertexShader: OCCUPANCY_VERTEX,
        fragmentShader: OCCUPANCY_FRAGMENT,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
      }),
    // Uniform values are updated below; the material itself is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const targets = useMemo(() => {
    const options: THREE.RenderTargetOptions = {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    };
    return [0, 1, 2].map(() => new THREE.WebGLRenderTarget(resolution, resolution, options)) as [
      THREE.WebGLRenderTarget,
      THREE.WebGLRenderTarget,
      THREE.WebGLRenderTarget,
    ];
  }, [resolution]);
  const weights = useMemo(() => gaussianWeights(Math.max(blur, 0.1)), [blur]);
  const quad = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: null },
        uStep: { value: new THREE.Vector2() },
        uWeights: { value: weights },
      },
      vertexShader: BLUR_VERTEX,
      fragmentShader: BLUR_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const screen = new THREE.Scene();
    screen.add(new THREE.Mesh(geometry, material));
    return { material, geometry, screen, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [weights]);
  const saved = useMemo(() => ({ color: new THREE.Color() }), []);
  const count = useRef(0);

  useEffect(() => {
    occupancy.uniforms.uFar!.value = far;
    occupancy.uniforms.uGround!.value = ground;
    aimContactShadowCamera(camera, size, ground);
  }, [camera, far, ground, occupancy, size]);

  useEffect(
    () => () => {
      targets.forEach((target) => target.dispose());
    },
    [targets],
  );
  useEffect(
    () => () => {
      quad.material.dispose();
      quad.geometry.dispose();
    },
    [quad],
  );
  useEffect(() => () => occupancy.dispose(), [occupancy]);

  useFrame(() => {
    count.current += 1;
    if (count.current % Math.max(frames, 1) !== 0) return;
    const oldTarget = gl.getRenderTarget();
    gl.getClearColor(saved.color);
    const oldAlpha = gl.getClearAlpha();
    const oldBackground = scene.background;
    const oldOverride = scene.overrideMaterial;
    const oldAutoClear = gl.autoClear;
    const oldShadowAuto = gl.shadowMap.autoUpdate;
    const group = cyclorama?.current;
    const oldVisible = group?.visible;
    const ownPlane = plane.current;
    try {
      if (group) group.visible = false;
      if (ownPlane) ownPlane.visible = false;
      scene.background = null;
      scene.overrideMaterial = occupancy;
      // The shadow map is already current for this frame; don't redraw it for this pass.
      gl.shadowMap.autoUpdate = false;
      gl.autoClear = false;
      gl.setClearColor(0x000000, 0);
      gl.setRenderTarget(targets[0]);
      gl.clear(true, false, false);
      gl.render(scene, camera);

      scene.overrideMaterial = oldOverride;
      for (let iteration = 0; iteration < 2; iteration += 1) {
        quad.material.uniforms.uMap!.value =
          iteration === 0 ? targets[0].texture : targets[2].texture;
        quad.material.uniforms.uStep!.value.set(1 / resolution, 0);
        gl.setRenderTarget(targets[1]);
        gl.clear(true, false, false);
        gl.render(quad.screen, quad.camera);
        quad.material.uniforms.uMap!.value = targets[1].texture;
        quad.material.uniforms.uStep!.value.set(0, 1 / resolution);
        gl.setRenderTarget(targets[2]);
        gl.clear(true, false, false);
        gl.render(quad.screen, quad.camera);
      }
    } finally {
      gl.setRenderTarget(oldTarget);
      gl.setClearColor(saved.color, oldAlpha);
      gl.autoClear = oldAutoClear;
      gl.shadowMap.autoUpdate = oldShadowAuto;
      scene.background = oldBackground;
      scene.overrideMaterial = oldOverride;
      if (group && oldVisible !== undefined) group.visible = oldVisible;
      if (ownPlane) ownPlane.visible = true;
    }
  });

  return (
    <mesh
      ref={plane}
      rotation={CONTACT_SHADOW_PLANE_ROTATION}
      scale={CONTACT_SHADOW_PLANE_SCALE}
      position={[0, ground + 0.004, 0]}
      renderOrder={2}
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={targets[2].texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
