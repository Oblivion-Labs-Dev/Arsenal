import { buildFragment, VERTEX, type FragmentOptions } from "./fragment.js";
import type { SceneMap } from "./types.js";

export interface SceneFrame {
  time: number;
  light: boolean;
  /** 0..1 how much of the scene is dimmed by an outage. */
  outage: number;
  /** Per module: x, y (plate px), highlight 0..1, failure 0..1. Length 4 × modules. */
  modules?: Float32Array;
  /** Per module: recovery glow 0..1. */
  recovery?: Float32Array;
  /** Packet x, y (plate px), visibility 0..1, blocked 0/1. */
  packet?: Float32Array;
}

export interface SceneRenderer {
  setImage(image: TexImageSource): void;
  resize(width: number, height: number): void;
  render(frame: SceneFrame): void;
  dispose(): void;
}

const NO_PACKET = new Float32Array(4);

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("arsenal-scene: could not create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`arsenal-scene: shader failed to compile: ${log ?? "unknown error"}`);
  }
  return shader;
}

/**
 * One full-screen triangle, one draw call per frame, no per-frame allocations, WebGL 1.
 * Throws when WebGL is unavailable or the shader fails, so the caller can fall back loudly
 * to the static plate image.
 */
export function createSceneRenderer(
  canvas: HTMLCanvasElement,
  map: SceneMap,
  options: FragmentOptions & { preserveDrawingBuffer?: boolean } = {}
): SceneRenderer {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
    powerPreference: "low-power",
  });
  if (!gl) throw new Error("arsenal-scene: WebGL is unavailable");
  const modules = options.modules ?? 0;

  const program = gl.createProgram();
  if (!program) throw new Error("arsenal-scene: could not create program");
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, buildFragment(map, options));
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`arsenal-scene: program failed to link: ${gl.getProgramInfoLog(program) ?? ""}`);
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uTime = u("uTime");
  const uLight = u("uLight");
  const uOutage = u("uOutage");
  const uMods = modules > 0 ? u("uMods") : null;
  const uRec = modules > 0 ? u("uRec") : null;
  const uPacket = u("uPacket");
  gl.uniform1i(u("uTex"), 0);

  let hasImage = false;

  return {
    setImage(image) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      hasImage = true;
    },
    resize(width, height) {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    },
    render(frame) {
      if (!hasImage) return;
      gl.uniform1f(uTime, frame.time);
      gl.uniform1f(uLight, frame.light ? 1 : 0);
      gl.uniform1f(uOutage, frame.outage);
      if (uMods && frame.modules) gl.uniform4fv(uMods, frame.modules);
      if (uRec && frame.recovery) gl.uniform1fv(uRec, frame.recovery);
      gl.uniform4fv(uPacket, frame.packet ?? NO_PACKET);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
