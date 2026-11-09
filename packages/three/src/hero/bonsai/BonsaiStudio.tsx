import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useArsenalTheme } from '@arsenal/fx';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useSceneFrameloop } from '../../scene-loop';
import type { HeroQuality } from '../shared';
import { HeroEnvContext, type Vec3 } from '../shared';
import { HeroBloom } from '../HeroBloom';
import { Cyclorama } from './Cyclorama';
import { ContactShadow } from './ContactShadow';
import { autoRotateEnd, autoRotateStart, autoRotateSpeed, AUTO_ROTATE_PERIOD_SECONDS, INITIAL_AUTO_ROTATE_STATE, ORBIT_POLAR_MAX, ORBIT_POLAR_MIN, shouldAutoRotate, type AutoRotateState } from './studio-math';

export interface BonsaiStudioProps {
  children?: ReactNode;
  light?: boolean;
  autoRotate?: boolean;
  background?: 'studio' | 'transparent';
  quality?: HeroQuality;
  camera?: { position?: Vec3; fov?: number; target?: Vec3 };
  bloom?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function BonsaiStudio({ children, light: lightProp, autoRotate = true, background = 'studio', quality = 'high', camera, bloom = true, className, style }: BonsaiStudioProps) {
  const host = useRef<HTMLDivElement>(null);
  const cyclorama = useRef<THREE.Group>(null);
  const { frameloop, reduced } = useSceneFrameloop(host);
  const theme = useArsenalTheme();
  const light = lightProp ?? theme.scheme === 'light';
  const env = useMemo(() => ({ light, reducedMotion: reduced }), [light, reduced]);
  // Memoised by value so inline arrays from callers don't rebuild the controls every render.
  const [px, py, pz] = camera?.position ?? DEFAULT_CAMERA_POSITION;
  const [tx, ty, tz] = camera?.target ?? DEFAULT_CAMERA_TARGET;
  const position = useMemo<Vec3>(() => [px, py, pz], [px, py, pz]);
  const target = useMemo<Vec3>(() => [tx, ty, tz], [tx, ty, tz]);
  const dpr = quality === 'high' ? 1.75 : quality === 'medium' ? 1.5 : 1.25;

  return <div ref={host} className={className} role="img" aria-label="Bonsai, drag to orbit" style={{ position: 'relative', width: '100%', height: '100%', cursor: 'grab', touchAction: 'none', ...style }}>
    <Canvas frameloop={frameloop} dpr={[1, dpr]} shadows="percentage" gl={{ antialias: true, alpha: background === 'transparent', powerPreference: 'high-performance' }} camera={{ position: [...position], fov: camera?.fov ?? 36, near: 0.1, far: 40 }} onCreated={({ gl, camera: activeCamera }) => {
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFShadowMap; // PCFSoft is deprecated in three 0.184; light.shadow.radius softens PCF.
      gl.domElement.style.touchAction = 'none';
      activeCamera.lookAt(...target);
    }}>
      <HeroEnvContext.Provider value={env}>
        <StudioExposure light={light} />
        <StudioEnvironment light={light} />
        <StudioControls autoRotate={autoRotate} reduced={reduced} host={host} target={target} />
        {background === 'studio' ? <Cyclorama objectRef={cyclorama} /> : null}
        <StudioLighting light={light} quality={quality} />
        {background === 'studio' ? <ContactShadow cyclorama={cyclorama} resolution={quality === 'low' ? 256 : 512} /> : null}
        {children}
        <HeroBloom enabled={bloom} samples={4} strength={light ? 0.15 : 0.35} threshold={light ? 0.97 : 0.9} radius={0.42} />
      </HeroEnvContext.Provider>
    </Canvas>
  </div>;
}

const DEFAULT_CAMERA_POSITION: Vec3 = [1.72, 1.16, 2.62];
const DEFAULT_CAMERA_TARGET: Vec3 = [0, 0.7, 0];

/** ACES with a per-theme exposure that follows theme changes (not just the first render). */
function StudioExposure({ light }: { light: boolean }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = light ? 1 : 1.25;
    invalidate();
  }, [gl, invalidate, light]);
  return null;
}

function StudioEnvironment({ light }: { light: boolean }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    scene.environment = target.texture;
    scene.environmentIntensity = light ? 0.6 : 0.5;
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      target.dispose(); room.dispose(); pmrem.dispose();
    };
  }, [gl, light, scene]);
  return null;
}

function StudioLighting({ light, quality }: { light: boolean; quality: HeroQuality }) {
  const mapSize = quality === 'high' ? 2048 : quality === 'medium' ? 1024 : 512;
  return <>
    <hemisphereLight args={[light ? '#fff4df' : '#8796a0', light ? '#887761' : '#171411', light ? 0.72 : 0.42]} />
    <directionalLight position={[3.6, 5.2, 3.4]} color={light ? '#fff0d7' : '#ffcf86'} intensity={light ? 2.3 : 4.3} castShadow shadow-mapSize-width={mapSize} shadow-mapSize-height={mapSize} shadow-camera-left={-2.2} shadow-camera-right={2.2} shadow-camera-top={2.2} shadow-camera-bottom={-2.2} shadow-camera-near={0.1} shadow-camera-far={14} shadow-radius={4} shadow-bias={-0.00012} shadow-normalBias={0.018} />
    <directionalLight position={[4, 4.5, -3.8]} color={light ? '#f2c98d' : '#ffc580'} intensity={light ? 1.35 : 3.0} />
    <directionalLight position={[-3.6, 2.8, 3.8]} color={light ? '#d9e1e6' : '#8aa0b0'} intensity={light ? 1.1 : 0.9} />
    <ambientLight color={light ? '#fff7ed' : '#82909c'} intensity={light ? 0.22 : 0.18} />
  </>;
}

function StudioControls({ autoRotate, reduced, host, target }: { autoRotate: boolean; reduced: boolean; host: React.RefObject<HTMLDivElement | null>; target: Vec3 }) {
  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const state = useRef<AutoRotateState>(INITIAL_AUTO_ROTATE_STATE);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.target.set(...target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minPolarAngle = ORBIT_POLAR_MIN;
    controls.maxPolarAngle = ORBIT_POLAR_MAX;
    controls.minDistance = 2.2;
    controls.maxDistance = 7;
    controls.autoRotateSpeed = autoRotateSpeed(AUTO_ROTATE_PERIOD_SECONDS);
    const start = () => { state.current = autoRotateStart(state.current, performance.now()); if (host.current) host.current.style.cursor = 'grabbing'; };
    const end = () => { state.current = autoRotateEnd(state.current, performance.now()); if (host.current) host.current.style.cursor = 'grab'; invalidate(); };
    const change = () => invalidate();
    controls.addEventListener('start', start);
    controls.addEventListener('end', end);
    controls.addEventListener('change', change);
    controls.update();
    invalidate();
    return () => {
      controls.removeEventListener('start', start);
      controls.removeEventListener('end', end);
      controls.removeEventListener('change', change);
      controls.dispose();
      controlsRef.current = null;
      if (host.current) host.current.style.cursor = 'grab';
    };
  }, [camera, gl, host, invalidate, target]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.autoRotate = shouldAutoRotate(state.current, performance.now(), autoRotate && !reduced);
    controls.update(delta);
    // Damping fires 'change' (which invalidates) until it settles; auto-rotate needs a steady clock.
    if (controls.autoRotate) invalidate();
  });
  return null;
}
