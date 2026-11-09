import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useArsenalTheme } from '@arsenal/fx';
import { useSceneFrameloop } from '../scene-loop';
import { HeroBackdrop } from './HeroBackdrop';
import { HeroBloom } from './HeroBloom';
import { HeroLighting } from './HeroLighting';
import { HeroEnvContext, type Vec3 } from './shared';

export interface HeroStageProps {
  children?: ReactNode;
  /** Light theme for every piece inside. Defaults to the Arsenal theme. */
  light?: boolean;
  camera?: { position?: Vec3; fov?: number; target?: Vec3 };
  /** Include the hero light rig. Default true; turn off to bring your own lights. */
  lighting?: boolean;
  /** Bloom pass. Default true in both themes (tuned softer in light mode). */
  bloom?: boolean;
  /** Atmospheric backdrop and fog. Default true; false leaves the canvas transparent. */
  backdrop?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * A ready canvas for hero pieces: a 34° camera, the hero light rig, optional bloom, and the
 * theme and reduced-motion state handed to every piece. Animates only on screen. Fills its parent.
 */
export function HeroStage({
  children,
  light: lightProp,
  camera,
  lighting = true,
  bloom,
  backdrop = true,
  className,
  style,
}: HeroStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const { frameloop, reduced } = useSceneFrameloop(host);
  const theme = useArsenalTheme();
  const light = lightProp ?? theme.scheme === 'light';
  const env = useMemo(() => ({ light, reducedMotion: reduced }), [light, reduced]);
  const position = camera?.position ?? [0, 1.6, 6.4];
  const target = camera?.target ?? [0, 0.4, 0];

  return (
    <div
      ref={host}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
    >
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.75]}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [...position], fov: camera?.fov ?? 34 }}
        onCreated={(state) => state.camera.lookAt(...target)}
        aria-hidden
      >
        <HeroEnvContext.Provider value={env}>
          <Exposure value={light ? 1 : 1.12} />
          {backdrop ? <HeroBackdrop /> : null}
          {lighting ? <HeroLighting /> : null}
          {children}
          <HeroBloom
            enabled={bloom ?? true}
            strength={light ? 0.28 : 0.62}
            threshold={light ? 0.95 : 0.82}
          />
        </HeroEnvContext.Provider>
      </Canvas>
    </div>
  );
}

/** ACES filmic tone mapping at a per-theme exposure (the bloom output pass reads the same). */
function Exposure({ value }: { value: number }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
}
