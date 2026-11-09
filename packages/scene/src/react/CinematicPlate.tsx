import { useEffect, useRef, type CSSProperties } from 'react';
import {
  IDENTITY_POSE,
  cameraTarget,
  poseSettled,
  stageTransform,
  stepPose,
  type CameraPose,
  type CameraTuning,
} from '../camera.js';
import { fitCrop, fitPlate, type StageFit } from '../fit.js';
import { HERO_PLATE } from '../presets/heroPlate.js';
import { createSceneRenderer, type SceneFrame, type SceneRenderer } from '../renderer.js';
import type { ComponentName, Rect, SceneMap } from '../types.js';

export interface CinematicPlateProps {
  /** Plate image (dark theme, or the only one). */
  src: string;
  /** Plate image for light mode; same composition as `src`. */
  srcLight?: string;
  /** Use the light plate and the shader's light grade. */
  light?: boolean;
  /** Where the live layers sit on the plate. Defaults to the bundled `HERO_PLATE`. */
  map?: SceneMap;
  /** Shader components to draw, in order. Defaults to all; an empty list draws the still plate. */
  components?: readonly ComponentName[];
  /**
   * Show one region of the plate (plate px) instead of the whole hero, e.g. a piece from
   * `HERO_PLATE_PIECES`. The region is fitted whole and centred; the camera defaults to off.
   */
  crop?: Rect;
  /** Fade the frame's edges into the page. Defaults to on when `crop` is set. */
  feather?: boolean;
  /** Alt text for the plate; empty (decorative) by default. */
  alt?: string;
  /** Damped pointer parallax and scroll push-in. Default true; reduced motion always disables it. */
  camera?: boolean;
  cameraTuning?: CameraTuning;
  /** Called once when WebGL or the texture fails; the static plate stays visible. */
  onError?: (error: Error) => void;
  className?: string;
  style?: CSSProperties;
}

/** Soft vignette mask so a cropped piece melts into the page instead of sitting in a box. */
const FEATHER = 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)';

/** Canvas backing width cap: the shader is per-pixel, so 4K buys nothing visible. */
const MAX_CANVAS_WIDTH = 2048;

/**
 * A cinematic art-plate hero: the still image fitted like `object-fit: cover` around the map's
 * focus, a one-pass WebGL layer bringing it to life (water, falls, rings, orbit lights, sphere,
 * beam) and a springed 2D camera. Fills its positioned parent. Without WebGL, or with reduced
 * motion, it shows the plate (one still shader frame when WebGL works); failures are logged.
 */
export function CinematicPlate({
  src,
  srcLight,
  light = false,
  map = HERO_PLATE,
  components,
  crop,
  feather = crop !== undefined,
  alt = '',
  camera = crop === undefined,
  cameraTuning,
  onError,
  className,
  style,
}: CinematicPlateProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ light, camera, cameraTuning, onError });
  live.current = { light, camera, cameraTuning, onError };
  const kickRef = useRef<() => void>(() => {});
  const plate = light && srcLight ? srcLight : src;
  // `null` (all components) must differ from an empty list (none).
  const componentKey = components ? components.join(',') : null;
  const cropKey = crop ? `${crop.x0},${crop.y0},${crop.x1},${crop.y1}` : '';

  useEffect(() => kickRef.current(), [light, camera]);

  useEffect(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!frame || !stage || !image || !canvas) return;

    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
    const still = () => motion?.matches ?? false;
    let placed: { fit: StageFit; width: number; height: number } | null = null;
    let renderer: SceneRenderer | null = null;
    let uploaded = false;
    let failed = false;
    let visible = true;
    let raf = 0;
    let last = 0;
    const pose: CameraPose = { ...IDENTITY_POSE };
    const velocity: CameraPose = { x: 0, y: 0, scale: 0 };
    const pointer = { x: 0, y: 0 };
    let scroll = 0;
    const sceneFrame: SceneFrame = { time: 0, light: false, outage: 0 };

    const fail = (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('CinematicPlate: showing the static plate.', err);
      canvas.dataset.ready = 'false';
      if (!failed) live.current.onError?.(err);
      failed = true;
    };

    try {
      renderer = createSceneRenderer(canvas, map, components ? { components } : {});
    } catch (error) {
      fail(error);
    }

    const applyCamera = () => {
      if (!placed) return;
      const useCamera = live.current.camera && !still();
      const t = stageTransform(map, placed.fit, placed, useCamera ? pose : IDENTITY_POSE);
      stage.style.transform = `translate3d(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px, 0) scale(${t.scale.toFixed(4)})`;
    };

    const draw = (now: number) => {
      if (!renderer || !uploaded || failed) return;
      sceneFrame.time = still() ? 12 : now / 1000;
      sceneFrame.light = live.current.light;
      renderer.render(sceneFrame);
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      let moving = false;
      if (placed && live.current.camera && !still()) {
        const goal = cameraTarget(
          map,
          { pointer, focus: null, packet: null, scroll },
          placed.fit,
          live.current.cameraTuning,
        );
        stepPose(pose, velocity, goal, dt);
        moving = !poseSettled(pose, goal, velocity);
      }
      applyCamera();
      draw(now);
      const ambient = uploaded && !failed && !still();
      if ((ambient || moving) && visible && !document.hidden) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const kick = () => {
      if (still()) {
        Object.assign(pose, IDENTITY_POSE);
        Object.assign(velocity, { x: 0, y: 0, scale: 0 });
      }
      if (raf) return;
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
      else {
        applyCamera();
        draw(performance.now());
      }
    };
    kickRef.current = kick;

    const layout = () => {
      const { width, height } = frame.getBoundingClientRect();
      const fit = crop ? fitCrop(map, crop, width, height) : fitPlate(map, width, height);
      placed = { fit, width, height };
      stage.style.width = `${map.width * fit.scale}px`;
      stage.style.height = `${map.height * fit.scale}px`;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.max(1, Math.min(Math.round(map.width * fit.scale * dpr), MAX_CANVAS_WIDTH));
      renderer?.resize(cw, Math.max(1, Math.round((cw * map.height) / map.width)));
      applyCamera();
      draw(performance.now());
    };
    layout();
    const resize = new ResizeObserver(layout);
    resize.observe(frame);

    const upload = () => {
      if (!renderer || failed || !image.complete || image.naturalWidth === 0) return;
      try {
        renderer.setImage(image);
      } catch (error) {
        fail(error);
        return;
      }
      uploaded = true;
      canvas.dataset.ready = 'true';
      kick();
    };
    const onImageError = () =>
      fail(new Error(`plate image failed to load: ${image.currentSrc || image.src}`));
    image.addEventListener('load', upload);
    image.addEventListener('error', onImageError);
    upload();

    const onLost = (event: Event) => {
      event.preventDefault();
      fail(new Error('WebGL context lost'));
    };
    canvas.addEventListener('webglcontextlost', onLost);

    const onPointer = (event: PointerEvent) => {
      if (!finePointer || event.pointerType !== 'mouse') return;
      const rect = frame.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
      kick();
    };
    const onScroll = () => {
      const rect = frame.getBoundingClientRect();
      scroll = rect.height > 0 ? Math.min(1, Math.max(0, -rect.top / rect.height)) : 0;
      kick();
    };
    frame.addEventListener('pointermove', onPointer);
    frame.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) kick();
    });
    intersection.observe(frame);
    document.addEventListener('visibilitychange', kick);
    motion?.addEventListener?.('change', kick);

    return () => {
      cancelAnimationFrame(raf);
      kickRef.current = () => {};
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', kick);
      motion?.removeEventListener?.('change', kick);
      window.removeEventListener('scroll', onScroll);
      frame.removeEventListener('pointermove', onPointer);
      frame.removeEventListener('pointerleave', onLeave);
      image.removeEventListener('load', upload);
      image.removeEventListener('error', onImageError);
      canvas.removeEventListener('webglcontextlost', onLost);
      renderer?.dispose();
    };
    // `components` is keyed by its joined names so a new array literal does not rebuild WebGL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, componentKey, cropKey]);

  return (
    <div
      ref={frameRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        ...(feather ? { maskImage: FEATHER, WebkitMaskImage: FEATHER } : null),
        ...style,
      }}
      data-arsenal-scene="plate"
    >
      <div
        ref={stageRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        <img
          ref={imageRef}
          src={plate}
          alt={alt}
          aria-hidden={alt ? undefined : true}
          decoding="async"
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
            userSelect: 'none',
          }}
        />
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-ready="false"
          className="arsenal-scene-canvas"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>
      <style>{`.arsenal-scene-canvas{opacity:0;transition:opacity .6s ease}.arsenal-scene-canvas[data-ready="true"]{opacity:1}`}</style>
    </div>
  );
}
