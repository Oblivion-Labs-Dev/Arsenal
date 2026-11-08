import { useId, useLayoutEffect, useMemo, useRef } from 'react';
import {
  CLAYFLOW_RUNTIME,
  CLAYFLOW_STYLE,
  renderClayFlow,
  renderFallback,
  validate,
} from '../index.js';

declare global {
  interface Window {
    ClayFlow?: {
      mount: (fig: HTMLElement) => void;
      unmount: (fig: HTMLElement) => void;
    };
  }
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
}

export function ClayFlowDiagram({ spec, mode, assetBase, className }: ClayFlowDiagramProps) {
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

  useLayoutEffect(() => {
    ensureClayFlowAssets();

    const container = containerRef.current;
    const newFigure = container?.querySelector<HTMLElement>('.cf') ?? null;
    const oldFigure = mountedFigureRef.current;

    if (oldFigure && oldFigure !== newFigure) {
      window.ClayFlow?.unmount(oldFigure);
      mountedFigureRef.current = null;
    }

    if (newFigure && !newFigure.classList.contains('cf-fallback')) {
      window.ClayFlow?.mount(newFigure);
      mountedFigureRef.current = newFigure;
    }

    return () => {
      if (mountedFigureRef.current) {
        window.ClayFlow?.unmount(mountedFigureRef.current);
        mountedFigureRef.current = null;
      }
    };
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={className ? `cf-diagram-host ${className}` : 'cf-diagram-host'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
