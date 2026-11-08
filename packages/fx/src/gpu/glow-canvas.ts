/**
 * A small WebGL2 painter for quieter scenes (a run view, an interest map): soft threads (cubic
 * curves, level at both ends) and sprites of light, in CSS pixels, composited premultiplied over
 * the page, so the same colours read as light on a dark theme and as ink on a light one. No bloom
 * pass and no loop of its own: its owner draws a frame when something changes, and animates only
 * while something is really happening (gate that on `shouldReduceMotion` from @arsenal/motion).
 *
 * Ported from Sutra `apps/web/src/glow-canvas.ts`.
 */
import { canvasBackingDpr } from "../runtime/canvas-guard";
import { compileProgram, reportFxError } from "./webgl";

export { rgb } from "./color";

export interface Thread {
  from: [number, number];
  to: [number, number];
  color: [number, number, number];
  /** 0..1 */
  alpha: number;
  /** Half width in CSS px. */
  width: number;
  /** Dotted, for a path that carries nothing yet. */
  dotted?: boolean;
}

export interface Light {
  at: [number, number];
  color: [number, number, number];
  /** Radius in CSS px. */
  radius: number;
  /** 0..1 and above for a bright core. */
  alpha: number;
  /** 0 a soft light, 1 a ring, 2 a node (a lit disc with a rim). */
  shape: 0 | 1 | 2;
}

export interface GlowCanvas {
  draw(threads: readonly Thread[], lights: readonly Light[]): void;
  resize(): void;
  dispose(): void;
}

export interface GlowCanvasOptions {
  /** Backing-store DPR cap. Default 1.5. */
  maxDpr?: number;
  /** Called when WebGL2 is missing, a shader fails, or the context is lost. Always also logged. */
  onError?: (error: Error) => void;
}

/** Floats per thread instance: from xy, to xy, rgb, alpha, half width, dotted. */
export const THREAD_STRIDE = 10;
/** Floats per light instance: x, y, radius, shape, rgb, alpha. */
export const LIGHT_STRIDE = 8;
/** Segments each thread curve is drawn with. */
export const THREAD_SEGMENTS = 32;

/** Packs threads into the instance buffer layout the thread shader reads. */
export function packThreads(threads: readonly Thread[]): Float32Array {
  const out = new Float32Array(threads.length * THREAD_STRIDE);
  threads.forEach((x, i) =>
    out.set(
      [...x.from, ...x.to, ...x.color, x.alpha, x.width, x.dotted ? 1 : 0],
      i * THREAD_STRIDE,
    ),
  );
  return out;
}

/** Packs lights into the instance buffer layout the light shader reads. */
export function packLights(lights: readonly Light[]): Float32Array {
  const out = new Float32Array(lights.length * LIGHT_STRIDE);
  lights.forEach((x, i) =>
    out.set([...x.at, x.radius, x.shape, ...x.color, x.alpha], i * LIGHT_STRIDE),
  );
  return out;
}

/**
 * The point at `t` (0..1) on a thread's curve, matching the shader: a cubic Bezier whose control
 * points sit level with each end at the horizontal midpoint. Useful for hit-testing and labels.
 */
export function threadPoint(
  from: readonly [number, number],
  to: readonly [number, number],
  t: number,
): [number, number] {
  const mx = (from[0] + to[0]) * 0.5;
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * from[0] + b * mx + c * mx + d * to[0],
    a * from[1] + b * from[1] + c * to[1] + d * to[1],
  ];
}

const THREAD_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aEnds;  // from xy, to xy (CSS px)
layout(location=1) in vec4 aColor; // rgb, alpha
layout(location=2) in vec2 aShape; // half width, dotted
uniform vec2 S;
out vec4 vColor; out float vAcross; out float vAlong; out float vDotted;
vec2 at(float t) {
  vec2 a = aEnds.xy, b = aEnds.zw; float mx = (a.x + b.x) * .5; float u = 1. - t;
  return u*u*u*a + 3.*u*u*t*vec2(mx, a.y) + 3.*u*t*t*vec2(mx, b.y) + t*t*t*b;
}
void main() {
  int v = gl_VertexID; int seg = v / 6; int c = v - seg * 6;
  float e = (c == 1 || c == 4 || c == 5) ? 1. : 0.; float side = (c == 2 || c == 3 || c == 5) ? 1. : -1.;
  float t = (float(seg) + e) / 32.;
  vec2 p = at(t); vec2 d = normalize(at(min(t + .01, 1.)) - at(max(t - .01, 0.)) + vec2(1e-5, 0.));
  vec2 pos = p + vec2(-d.y, d.x) * side * (aShape.x + 1.5);
  gl_Position = vec4(pos.x / S.x * 2. - 1., 1. - pos.y / S.y * 2., 0., 1.);
  vColor = aColor; vAcross = side * (aShape.x + 1.5) / aShape.x; vAlong = t * length(aEnds.zw - aEnds.xy); vDotted = aShape.y;
}`;

const THREAD_FS = `#version 300 es
precision highp float;
in vec4 vColor; in float vAcross; in float vAlong; in float vDotted; out vec4 o;
void main() {
  float a = exp(-vAcross * vAcross * 1.6) * vColor.a;
  if (vDotted > .5) a *= smoothstep(.3, .5, abs(fract(vAlong / 7.) - .5) * 2.);
  o = vec4(vColor.rgb * a, a);
}`;

const LIGHT_VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 aAt;    // x, y, radius, shape
layout(location=1) in vec4 aColor; // rgb, alpha
uniform vec2 S;
out vec2 vUv; out vec4 vColor; out float vShape;
void main() {
  int c = gl_VertexID;
  vec2 q = vec2((c == 1 || c == 4 || c == 5) ? 1. : -1., (c == 2 || c == 3 || c == 5) ? 1. : -1.);
  vec2 pos = aAt.xy + q * aAt.z;
  gl_Position = vec4(pos.x / S.x * 2. - 1., 1. - pos.y / S.y * 2., 0., 1.);
  vUv = q; vColor = aColor; vShape = aAt.w;
}`;

const LIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv; in vec4 vColor; in float vShape; out vec4 o;
void main() {
  float r = length(vUv); float a;
  if (vShape < .5) a = exp(-r * r * 7.) + exp(-r * r * 40.) * .8;
  else if (vShape < 1.5) a = exp(-pow((r - .8) / .07, 2.));
  else a = (1. - smoothstep(.36, .42, r)) * .85 + exp(-pow((r - .4) / .05, 2.)) * .6 + exp(-r * r * 5.) * .25;
  a *= vColor.a;
  o = vec4(vColor.rgb * a, min(a, 1.));
}`;

export const GLOW_SHADERS = { THREAD_VS, THREAD_FS, LIGHT_VS, LIGHT_FS } as const;

/**
 * Returns null without WebGL2 or when a shader fails (reported through `onError` and the console);
 * the owner then keeps its static drawing.
 */
export function glowCanvas(
  canvas: HTMLCanvasElement,
  options: GlowCanvasOptions = {},
): GlowCanvas | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) {
    reportFxError("glowCanvas", new Error("WebGL2 is not available"), options.onError);
    return null;
  }
  let threads: WebGLProgram;
  let lights: WebGLProgram;
  try {
    threads = compileProgram(gl, THREAD_VS, THREAD_FS);
    lights = compileProgram(gl, LIGHT_VS, LIGHT_FS);
  } catch (error) {
    reportFxError("glowCanvas", error, options.onError);
    return null;
  }
  let lost = false;
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    reportFxError("glowCanvas", new Error("WebGL2 context lost"), options.onError);
  };
  canvas.addEventListener("webglcontextlost", onLost);

  const instanced = (layout: number[]) => {
    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    if (!buffer || !vao) throw new Error("WebGL2: could not allocate buffers");
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const stride = layout.reduce((a, b) => a + b, 0) * 4;
    let offset = 0;
    layout.forEach((n, i) => {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, n, gl.FLOAT, false, stride, offset);
      gl.vertexAttribDivisor(i, 1);
      offset += n * 4;
    });
    gl.bindVertexArray(null);
    return { buffer, vao };
  };
  let threadData: ReturnType<typeof instanced>;
  let lightData: ReturnType<typeof instanced>;
  try {
    threadData = instanced([4, 4, 2]);
    lightData = instanced([4, 4]);
  } catch (error) {
    canvas.removeEventListener("webglcontextlost", onLost);
    reportFxError("glowCanvas", error, options.onError);
    return null;
  }
  const threadSize = gl.getUniformLocation(threads, "S");
  const lightSize = gl.getUniformLocation(lights, "S");
  let size: [number, number] = [1, 1];

  const resize = () => {
    const dpr = canvasBackingDpr(options.maxDpr ?? 1.5);
    size = [canvas.clientWidth || 1, canvas.clientHeight || 1];
    canvas.width = Math.round(size[0] * dpr);
    canvas.height = Math.round(size[1] * dpr);
  };
  resize();

  return {
    resize,
    draw(ts, ls) {
      if (lost) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(threads);
      gl.uniform2f(threadSize, size[0], size[1]);
      gl.bindBuffer(gl.ARRAY_BUFFER, threadData.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, packThreads(ts), gl.DYNAMIC_DRAW);
      gl.bindVertexArray(threadData.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, THREAD_SEGMENTS * 6, ts.length);
      gl.useProgram(lights);
      gl.uniform2f(lightSize, size[0], size[1]);
      gl.bindBuffer(gl.ARRAY_BUFFER, lightData.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, packLights(ls), gl.DYNAMIC_DRAW);
      gl.bindVertexArray(lightData.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, ls.length);
      gl.bindVertexArray(null);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
