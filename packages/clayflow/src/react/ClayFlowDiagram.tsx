import { useId, useLayoutEffect, useMemo, useRef } from 'react';
import {
  type ClayFlowInstanceAPI,
  CLAYFLOW_RUNTIME,
  CLAYFLOW_STYLE,
  renderClayFlow,
  renderFallback,
  validate,
} from '../index.js';

declare global {
  interface Window {
    ClayFlow?: ClayFlowRuntime;
  }
}

interface ClayFlowRuntime {
  mount(fig: HTMLElement): void;
  unmount(fig: HTMLElement): void;
  get(fig: HTMLElement): ClayFlowInstanceAPI | null;
}

/**
 * Ensures ClayFlow styles and runtime are injected into the document head once.
 * Checking DOM elements and window.ClayFlow avoids redundant work.
 */
function ensureClayFlowAssets(): void {
  if (typeof document === 'undefined') return;

  if (!document.getElementById('clayflow-style')) {
    const style = document.createElement('style');
    style.id = 'clayflow-style';
    style.textContent = CLAYFLOW_STYLE;
    document.head.appendChild(style);
  }

  if (!window.ClayFlow && !document.getElementById('clayflow-runtime')) {
    const script = document.createElement('script');
    script.id = 'clayflow-runtime';
    script.textContent = CLAYFLOW_RUNTIME;
    document.head.appendChild(script);
  }
}

// Assets are injected from the layout effect, never at import: the runtime auto-mounts every
// figure on load, and doing that before hydration rewrites server-rendered HTML.

export interface ClayFlowDiagramProps {
  spec: unknown;
  mode?: 'eli5' | 'advanced';
  assetBase?: string;
  className?: string;
  onReady?: (api: ClayFlowInstanceAPI) => void;
  autoPlay?: boolean;
  initialStep?: number;
}

export function ClayFlowDiagram({ spec, mode, assetBase, className, onReady, autoPlay = false, initialStep }: ClayFlowDiagramProps) {
  const rawId = useId();
  // Safe ID prefix matching ^[a-z0-9-]{1,32}$
  const safeIdPrefix = useMemo(() => {
    const sanitized = rawId.toLowerCase().replace(/[^a-z0-9-]/g, '');
    return `cf-${sanitized || 'diag'}`;
  }, [rawId]);

  const validation = useMemo(() => validate(spec), [spec]);

  const html = useMemo(() => {
    if (validation.ok) {
      return renderClayFlow(validation.diagram, {
        idPrefix: safeIdPrefix,
        mode,
        assetBase,
      });
    }
    return renderFallback(validation.fallback);
  }, [validation, safeIdPrefix, mode, assetBase]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountedFigureRef = useRef<HTMLElement | null>(null);
  // Mount-time options live in a ref: a new inline onReady on every parent render must not
  // remount the runtime (that would reset playback). Only a new spec/html remounts.
  const mountOptions = useRef({ onReady, autoPlay, initialStep });
  mountOptions.current = { onReady, autoPlay, initialStep };

  // Runs after every render, but only touches the runtime when the live figure element changed.
  // React 19 re-applies dangerouslySetInnerHTML whenever the prop object changes identity, which
  // swaps in a fresh, unmounted figure; keying this on [html] alone would miss that.
  useLayoutEffect(() => {
    ensureClayFlowAssets();

    const container = containerRef.current;
    const newFigure = container?.querySelector<HTMLElement>('.cf') ?? null;
    const oldFigure = mountedFigureRef.current;
    if (newFigure === oldFigure) return;

    if (oldFigure) {
      window.ClayFlow?.unmount(oldFigure);
      mountedFigureRef.current = null;
    }

    if (newFigure && !newFigure.classList.contains('cf-fallback')) {
      window.ClayFlow?.mount(newFigure);
      mountedFigureRef.current = newFigure;
      const api = window.ClayFlow?.get(newFigure);
      if (api) {
        const opts = mountOptions.current;
        if (opts.initialStep !== undefined) api.seek(opts.initialStep);
        opts.onReady?.(api);
        if (opts.autoPlay) api.play();
      }
    }
  });

  useLayoutEffect(
    () => () => {
      if (mountedFigureRef.current) {
        window.ClayFlow?.unmount(mountedFigureRef.current);
        mountedFigureRef.current = null;
      }
    },
    [],
  );

  // A stable object keeps React 19 from rewriting the markup (and resetting playback) on re-render.
  const innerHtml = useMemo(() => ({ __html: html }), [html]);

  return (
    <div
      ref={containerRef}
      className={className ? `cf-diagram-host ${className}` : 'cf-diagram-host'}
      dangerouslySetInnerHTML={innerHtml}
    />
  );
}
