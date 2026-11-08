import { useEffect, useRef, useState, type RefObject } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '@arsenal/motion';
import { bindCanvasRunState } from '../runtime/canvas-guard';
import { reportFxError } from './webgl';

/** What a GPU scene offers the page that shows it. */
export interface GpuScene {
  /** Starts the frame loop; a no-op while it is running. */
  start(): void;
  /** Stops the frame loop and keeps the last frame on screen. */
  stop(): void;
  /** Draws one frame without starting the loop. */
  still(): void;
  /** Settles if the GPU device is lost or errs; the page then goes static. */
  readonly lost: Promise<void>;
  dispose(): void;
}

export type GpuSceneFactory<S extends GpuScene> = (
  canvas: HTMLCanvasElement,
  small: boolean,
) => Promise<S>;

export interface UseGpuSceneOptions {
  /** Whether there is something to animate; a quiet scene draws one still frame. Default true. */
  active?: boolean;
  /** Turns the scene off entirely (static art only). Default true. */
  enabled?: boolean;
  /** Which API the factory needs, for the capability check. Default "webgpu". */
  backend?: 'webgpu' | 'webgl';
  /** Stop waiting for the scene after this long and keep the static art. Default 3000ms. */
  timeoutMs?: number;
  /** Media query that marks a small/low-power screen, passed to the factory. */
  smallQuery?: string;
  /** Called when creating the scene fails or the device is lost. Always also logged. */
  onError?: (error: Error) => void;
}

export type GpuRenderer = 'static' | 'pending' | 'gpu';

function supports(backend: 'webgpu' | 'webgl'): boolean {
  if (typeof window === 'undefined') return false;
  return backend === 'webgl' ? 'WebGL2RenderingContext' in window : 'gpu' in navigator;
}

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

/**
 * The life of a page's GPU scene. The scene exists only while motion is allowed, and its code loads
 * only when it will run (pass a factory that dynamic-imports the scene). A canvas has one GPU
 * context, so a scene is created only after the previous one is disposed.
 *
 * The static art is the immediate baseline and stays visible through `pending` (adapter, device and
 * pipeline setup); the page never waits on the GPU to show something useful. `pending` gives up
 * after `timeoutMs`, as does a scene that fails or is lost. Reaching `gpu` should crossfade the
 * canvas over the static art. The scene runs only while `watch` is on screen in a visible tab and
 * `active` is true; `watch` carries `data-running` for tests.
 *
 * Ported from Sutra `apps/web/src/useGpuScene.ts`.
 */
export function useGpuScene<S extends GpuScene>(
  canvas: RefObject<HTMLCanvasElement | null>,
  watch: RefObject<HTMLElement | null>,
  create: GpuSceneFactory<S> | undefined,
  options: UseGpuSceneOptions = {},
) {
  const {
    active = true,
    enabled = true,
    backend = 'webgpu',
    timeoutMs = 3000,
    smallQuery = '(max-width: 48rem), (pointer: coarse)',
  } = options;
  const scene = useRef<S | null>(null);
  const creation = useRef<Promise<unknown>>(Promise.resolve());
  // Latest callbacks, so a new closure each render does not rebuild the scene.
  const createRef = useRef(create);
  createRef.current = create;
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  const [reduced, setReduced] = useState(shouldReduceMotion);
  const [ready, setReady] = useState(false);
  const supported = supports(backend);
  const hasFactory = !!create;
  const [waiting, setWaiting] = useState(() => enabled && hasFactory && supported && !reduced);

  useEffect(() => onMotionPreferenceChange(setReduced), []);

  useEffect(() => {
    const factory = createRef.current;
    if (!enabled || !factory || reduced || !supported || !canvas.current) {
      setWaiting(false);
      return;
    }
    const element = canvas.current;
    let cancelled = false;
    let created: S | null = null;
    const small = matches(smallQuery);
    setWaiting(true);
    const giveUp = setTimeout(() => setWaiting(false), timeoutMs);
    const run = creation.current
      .then(() => (cancelled ? null : factory(element, small)))
      .then((next) => {
        if (!next) return;
        if (cancelled) return next.dispose();
        created = next;
        scene.current = next;
        setReady(true);
        setWaiting(false);
        void next.lost.then(() => {
          if (scene.current === next) {
            scene.current = null;
            setReady(false);
          }
        });
      })
      .catch((error: unknown) => {
        // No adapter, blocked GPU or a failed pipeline: report it and keep the static art.
        reportFxError('GPU scene could not start', error, onErrorRef.current);
        setWaiting(false);
      });
    creation.current = run;
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      setWaiting(false);
      created?.dispose();
      scene.current = null;
      setReady(false);
    };
  }, [reduced, enabled, supported, backend, hasFactory, timeoutMs, smallQuery, canvas]);

  useEffect(() => {
    const element = watch.current;
    if (!element) return;
    const unbind = bindCanvasRunState(
      element,
      (onScreen) => {
        const running = ready && onScreen && active;
        element.dataset.running = String(running);
        const current = scene.current;
        if (!current) return;
        if (running) current.start();
        else if (onScreen) current.still();
        else current.stop();
      },
      { rootMargin: '0px' },
    );
    return () => {
      unbind();
      scene.current?.stop();
    };
  }, [ready, active, watch]);

  const renderer: GpuRenderer =
    !enabled || !create ? 'static' : ready ? 'gpu' : waiting ? 'pending' : 'static';
  return { scene, ready, renderer };
}
