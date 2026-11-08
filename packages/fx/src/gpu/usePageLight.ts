import { useEffect, useRef, useState } from 'react';
import { onMotionPreferenceChange, shouldReduceMotion } from '@arsenal/motion';
import { canvasBackingDpr } from '../runtime/canvas-guard';
import { cssVarRgb, isDarkColor, toLinear } from './color';
import { compileProgram, reportFxError } from './webgl';

/** Four soft pools of light in the page's colours, drifting with the scroll. */
export const PAGE_LIGHT_FIELD = `#version 300 es
precision highp float;
uniform vec2 R; uniform float T, Y, dark; uniform vec3 C0, C1; out vec4 o;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
vec3 pool(vec2 w, vec2 a, float depth, float r, vec3 c, float k) {
  vec2 q = vec2(a.x, fract(a.y - Y * depth) * 1.8 - .4) + .06 * vec2(sin(T * .08 + k), cos(T * .06 + k * 1.7));
  vec2 d = w - q; return c * exp(-dot(d, d) / (r * r)); }
void main() {
  vec2 uv = gl_FragCoord.xy / R; uv.y = 1. - uv.y; float asp = R.x / R.y; vec2 p = vec2(uv.x * asp, uv.y);
  vec2 w = p + (vec2(n(p * 1.3 + T * .02), n(p * 1.3 + 4. - T * .02)) - .5) * .35;
  vec3 L = pool(w, vec2(-.05 * asp, .2), .2, .6, C0, 0.) + pool(w, vec2(1.05 * asp, .55), .35, .6, C1, 1.)
    + pool(w, vec2(.1 * asp, .95), .5, .5, C1, 2.) + pool(w, vec2(.9 * asp, 1.2), .6, .55, C0, 3.);
  if (dark > .5) { vec3 c = L * .08; o = vec4(c, max(c.r, max(c.g, c.b))); }
  else { float m = max(L.r, max(L.g, L.b)); float a = clamp(m * .07, 0., .08); o = vec4(L / max(m, 1e-4) * a, a); }
}`;

const FULLSCREEN_VS =
  '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID&1)*4-1,(gl_VertexID>>1)*4-1);gl_Position=vec4(p,0.,1.);}';

export interface UsePageLightOptions {
  /** Turns the light off. Default true. */
  enabled?: boolean;
  /** Class put on the canvas, for extra styling. Default "arsenal-page-light". */
  className?: string;
  /** Two CSS custom properties for the pools. Default accent and success. */
  colorVars?: readonly [string, string];
  /** CSS custom property used to tell dark from light themes. Default "--arsenal-background". */
  backgroundVar?: string;
  /** Element the canvas is prepended to. Default document.body. */
  container?: HTMLElement | null;
  /** Frame cap while awake. Default 30. */
  fps?: number;
  /** Backing-store DPR cap (the field then renders at half of it). Default 1.5. */
  maxDpr?: number;
  /** Called when WebGL2 is missing or the shader fails. Always also logged. */
  onError?: (error: Error) => void;
}

/**
 * A faint light behind an app page (WebGL2): soft pools in the page's accent colours that drift a
 * little as the page scrolls. Drawn at half resolution, only while the page scrolls or the pointer
 * moves and for two seconds after, then stopped; none with reduced motion or without WebGL2, so
 * the page's own background stays the static fallback. The canvas is fixed behind the page and
 * fades in; styles are inline, so no stylesheet is needed.
 *
 * Ported from Sutra `apps/web/src/usePageLight.ts`.
 */
export function usePageLight(options: UsePageLightOptions = {}): void {
  const {
    enabled = true,
    className = 'arsenal-page-light',
    colorVars = ['--arsenal-accent', '--arsenal-success'] as const,
    backgroundVar = '--arsenal-background',
    container,
    fps = 30,
    maxDpr = 1.5,
  } = options;
  const [reduced, setReduced] = useState(shouldReduceMotion);
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;
  const [varA, varB] = colorVars;

  useEffect(() => onMotionPreferenceChange(setReduced), []);

  useEffect(() => {
    if (!enabled || reduced || typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.className = className;
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '-1',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 1.2s ease',
    });
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!gl) {
      reportFxError('usePageLight', new Error('WebGL2 is not available'), onErrorRef.current);
      return;
    }
    let program: WebGLProgram;
    try {
      program = compileProgram(gl, FULLSCREEN_VS, PAGE_LIGHT_FIELD);
    } catch (error) {
      reportFxError('usePageLight', error, onErrorRef.current);
      return;
    }
    const uniforms = {
      R: gl.getUniformLocation(program, 'R'),
      T: gl.getUniformLocation(program, 'T'),
      Y: gl.getUniformLocation(program, 'Y'),
      dark: gl.getUniformLocation(program, 'dark'),
      C0: gl.getUniformLocation(program, 'C0'),
      C1: gl.getUniformLocation(program, 'C1'),
    };
    const vao = gl.createVertexArray();
    (container ?? document.body).prepend(canvas);
    const reveal = requestAnimationFrame(() => {
      canvas.style.opacity = '1';
    });
    const onLost = (event: Event) => {
      event.preventDefault();
      reportFxError('usePageLight', new Error('WebGL2 context lost'), onErrorRef.current);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    let tones = { a: [1, 1, 1], b: [1, 1, 1], dark: true };
    const read = () => {
      tones = {
        a: toLinear(cssVarRgb(varA)),
        b: toLinear(cssVarRgb(varB)),
        dark: isDarkColor(cssVarRgb(backgroundVar, [0, 0, 0])),
      };
    };
    const size = () => {
      const d = canvasBackingDpr(maxDpr) * 0.5;
      canvas.width = Math.max(1, Math.round(innerWidth * d));
      canvas.height = Math.max(1, Math.round(innerHeight * d));
    };
    read();
    size();
    let raf = 0;
    let last = performance.now();
    let until = 0;
    let t = 0;
    const frameMs = 1000 / Math.max(1, fps);
    const frame = (now: number) => {
      raf = 0;
      if (now - last < frameMs - 2) {
        raf = requestAnimationFrame(frame);
        return;
      }
      t += Math.min(0.05, (now - last) / 1000);
      last = now;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform2f(uniforms.R, canvas.width, canvas.height);
      gl.uniform1f(uniforms.T, t);
      gl.uniform1f(uniforms.Y, scrollY / innerHeight);
      gl.uniform1f(uniforms.dark, tones.dark ? 1 : 0);
      gl.uniform3fv(uniforms.C0, tones.a);
      gl.uniform3fv(uniforms.C1, tones.b);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (now < until) raf = requestAnimationFrame(frame);
    };
    const wake = (ms = 2000) => {
      if (document.hidden) return;
      until = Math.max(until, performance.now() + ms);
      if (!raf) {
        last = performance.now() - 40;
        raf = requestAnimationFrame(frame);
      }
    };
    const onResize = () => {
      size();
      wake(300);
    };
    const onTheme = () => {
      read();
      wake(300);
    };
    const theme = new MutationObserver(onTheme);
    theme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    const onScroll = () => wake();
    const onPointer = () => wake(1200);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('pointermove', onPointer, { passive: true });
    addEventListener('resize', onResize);
    scheme.addEventListener('change', onTheme);
    wake(1500);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(reveal);
      theme.disconnect();
      removeEventListener('scroll', onScroll);
      removeEventListener('pointermove', onPointer);
      removeEventListener('resize', onResize);
      scheme.removeEventListener('change', onTheme);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    };
  }, [enabled, reduced, className, varA, varB, backgroundVar, container, fps, maxDpr]);
}
