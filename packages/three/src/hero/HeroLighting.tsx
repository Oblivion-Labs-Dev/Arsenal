import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useHeroEnv } from './shared';

export interface HeroLightingProps {
  light?: boolean;
  /** Soft studio reflections for glass, water and metal (a PMREM room environment). Default true. */
  environment?: boolean;
  /** Cast shadows from the key light. Default true. */
  shadows?: boolean;
}

/**
 * The hero's light rig: a low cool fill, a warm key from upper left, an amber rim from behind
 * right and a cool side fill, plus an optional room environment for reflections. The warm core
 * glow comes from CoreSphere itself, so it moves with the core.
 */
export function HeroLighting({
  light: lightProp,
  environment = true,
  shadows = true,
}: HeroLightingProps) {
  const { light } = useHeroEnv(lightProp);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!environment) return;
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    scene.environment = target.texture;
    scene.environmentIntensity = light ? 0.5 : 0.22;
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      target.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [environment, gl, light, scene]);

  // Dark mode follows the painting: a low, cool fill so shadows stay deep, a warm key that
  // rakes the rock and foliage and an amber rim from behind-right (the light shaft). Light mode
  // is a soft daylit studio.
  return (
    <>
      <ambientLight intensity={light ? 0.5 : 0.08} color={light ? '#fff6e9' : '#8fa0ad'} />
      <hemisphereLight
        args={[light ? '#fff4df' : '#6f8291', light ? '#8a7a64' : '#0b0b0a', light ? 0.75 : 0.32]}
      />
      <directionalLight
        position={[-4.5, 6, 4]}
        color={light ? '#fff0d7' : '#ffd9a3'}
        intensity={light ? 2.1 : 1.35}
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={18}
        shadow-bias={-0.00015}
        shadow-normalBias={0.02}
      />
      <directionalLight
        position={[4.2, 4.6, -4.4]}
        color={light ? '#f2c98d' : '#ffb554'}
        intensity={light ? 1.1 : 2.6}
      />
      <pointLight
        position={[-3.4, 1.4, 2.2]}
        color={light ? '#dfe5df' : '#7f9db3'}
        intensity={light ? 1.6 : 2.2}
        distance={9}
        decay={2}
      />
    </>
  );
}
