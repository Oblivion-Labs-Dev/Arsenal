/**
 * PrintPlate: a photograph redrawn once as a newsprint halftone or an ink line drawing.
 *
 * Origin: amsborse.github.io redesign, `src/designs/DesignPlate.tsx`.
 * Lift-and-shift: copy this file, `plate-art.ts` and `print-plate.css`.
 *
 * Draws once per (src, treatment, colours, dark); there is no animation loop. The canvas carries
 * `data-ready="false" | "true" | "failed"` so styles and tests can follow the load; failures are
 * logged loudly with console.error, never swallowed.
 */
import { useEffect, useRef } from 'react';
import { drawHalftone, drawLinework, loadImage } from './plate-art';

export type PrintTreatment = 'halftone' | 'linework';
export type PrintPlateState = 'false' | 'true' | 'failed';

export interface PrintPlateProps {
  /** Image to interpret. Use the full-size source for crisp linework. */
  src: string;
  treatment: PrintTreatment;
  /** Ink colour. Defaults to the value of `inkVar` on <html>, then `#161412`. */
  ink?: string;
  /** Spot / accent colour (halftone spot screen, linework ink). Defaults to `accentVar`, then `#46c8ea`. */
  accent?: string;
  /** CSS custom property read for `ink` when it is not passed. */
  inkVar?: string;
  /** CSS custom property read for `accent` when it is not passed. */
  accentVar?: string;
  /** Dark ground: print light ink where the photo is bright. Pass your theme so it redraws. */
  dark?: boolean;
  /** Canvas backing size in pixels (the element itself is sized by CSS). */
  width?: number;
  height?: number;
  className?: string;
  /** Called after each draw attempt with the new state. */
  onStateChange?: (state: Exclude<PrintPlateState, 'false'>) => void;
}

const DEFAULT_SIZE = { width: 1672, height: 941 };

function readVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function PrintPlate({
  src,
  treatment,
  ink,
  accent,
  inkVar = '--color-ink',
  accentVar = '--color-accent',
  dark = false,
  width = DEFAULT_SIZE.width,
  height = DEFAULT_SIZE.height,
  className = '',
  onStateChange,
}: PrintPlateProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const notify = useRef(onStateChange);
  notify.current = onStateChange;

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let cancelled = false;
    element.dataset.ready = 'false';
    loadImage(src)
      .then((image) => {
        if (cancelled) return;
        const accentColor = accent ?? readVar(accentVar, '#46c8ea');
        const inkColor = ink ?? readVar(inkVar, '#161412');
        if (treatment === 'halftone') {
          drawHalftone(element, image, { ink: inkColor, spot: accentColor, dark });
        } else {
          drawLinework(element, image, accentColor);
        }
        element.dataset.ready = 'true';
        notify.current?.('true');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('[print-plate]', error);
        element.dataset.ready = 'failed';
        notify.current?.('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [src, treatment, ink, accent, inkVar, accentVar, dark, width, height]);

  return (
    <canvas
      ref={canvas}
      className={`arsenal-print-plate arsenal-print-plate--${treatment} ${className}`.trim()}
      width={width}
      height={height}
      aria-hidden="true"
      data-ready="false"
    />
  );
}
