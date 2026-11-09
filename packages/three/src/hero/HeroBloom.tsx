import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface HeroBloomProps {
  /** Off renders the scene directly. Default true. */
  enabled?: boolean;
  strength?: number;
  radius?: number;
  /** Only pixels brighter than this (linear) bloom: windows, packets, streaks and the core. */
  threshold?: number;
  /**
   * MSAA samples for the composer's render target (0 = none, the old behaviour). Alpha-to-coverage
   * foliage needs multisampling to soften its cut-out edges once bloom takes over rendering.
   */
  samples?: number;
}

/**
 * Soft bloom over the whole canvas. Mount once per Canvas: it takes over rendering (priority 1
 * frame callback) and always draws, through the composer when enabled or directly otherwise.
 */
export function HeroBloom({
  enabled = true,
  strength = 0.62,
  radius = 0.55,
  threshold = 0.82,
  samples = 0,
}: HeroBloomProps) {
  const composer = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const { gl, scene, camera, size } = useThree();

  useEffect(() => {
    if (!enabled) return;
    const target =
      samples > 0
        ? new THREE.WebGLRenderTarget(size.width, size.height, {
            type: THREE.HalfFloatType,
            samples,
          })
        : undefined;
    const pipeline = new EffectComposer(gl, target);
    pipeline.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      strength,
      radius,
      threshold,
    );
    pipeline.addPass(bloom);
    // Tone mapping and sRGB output: without this the composer shows raw linear light.
    pipeline.addPass(new OutputPass());
    pipeline.setPixelRatio(gl.getPixelRatio());
    pipeline.setSize(size.width, size.height);
    composer.current = pipeline;
    bloomRef.current = bloom;
    return () => {
      composer.current = null;
      bloomRef.current = null;
      bloom.dispose();
      pipeline.dispose();
    };
    // Tuning is applied live below; only structural changes rebuild the composer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, enabled, gl, samples, scene, size.height, size.width]);

  useEffect(() => {
    const bloom = bloomRef.current;
    if (!bloom) return;
    bloom.strength = strength;
    bloom.radius = radius;
    bloom.threshold = threshold;
  }, [strength, radius, threshold, enabled]);

  useFrame((_, delta) => {
    if (composer.current) composer.current.render(delta);
    else gl.render(scene, camera);
  }, 1);

  return null;
}
