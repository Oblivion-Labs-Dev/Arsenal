/// <reference types="@webgpu/types" />
/**
 * What every WebGPU scene shares: opening a hardware device on a canvas, building pipelines and
 * bind groups from WGSL, a fullscreen pass, a physically based bloom and AgX tone mapping. Each
 * scene builds its own drawing from these; nothing here draws.
 *
 * Ported from Sutra `apps/web/src/gpu-stage.ts` (identical to the amsborse.github.io copy apart
 * from formatting).
 *
 * Shader contract: PREFILTER reads a `scene` uniform with `view.w` (downsample reach) and
 * `extra.w` (exposure); UPSAMPLE samples `src`. Bind groups are matched to WGSL by name.
 */

export const BLOOM_LEVELS = 3;
export const BLOOM_STRENGTH = 0.8;
export const BLOOM_TAIL = 1.6;
/** The sum of every level's weight, so the spread light has the energy it took. */
export const BLOOM_WEIGHT = ((BLOOM_TAIL ** BLOOM_LEVELS - 1) / (BLOOM_TAIL - 1)).toFixed(4);

// Bloom, as a lens scatters light: a soft threshold keeps only light brighter than the page can
// show, then a mip chain at half resolution and below spreads it. Downsampling uses the 13-tap
// filter from Call of Duty: Advanced Warfare (Jimenez 2014), upsampling a 3x3 tent, each level
// added into the next larger one, so the smallest levels give the wide, soft tail.
export const BLOOM = /* wgsl */ `
@group(0) @binding(1) var src: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;

fn luma(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }

// Soft-knee threshold: light fades in below the threshold instead of popping.
fn bright(c: vec3f) -> vec3f {
  let threshold = 0.6;
  let knee = 0.4;
  let b = max(c.r, max(c.g, c.b));
  var soft = clamp(b - threshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-5);
  return c * max(soft, b - threshold) / max(b, 1e-5);
}

fn tap(uv: vec2f, offset: vec2f) -> vec3f {
  return textureSampleLevel(src, linear, uv + offset / vec2f(textureDimensions(src)), 0.0).rgb;
}

// Weighted by 1 / (1 + luma) (Karis) on the first level, so a single hot glint cannot flicker a
// whole block of bloom.
fn karis(a: vec3f, b: vec3f, c: vec3f, d: vec3f, on: bool) -> vec3f {
  if (!on) { return (a + b + c + d) * 0.25; }
  let wa = 1.0 / (1.0 + luma(a));
  let wb = 1.0 / (1.0 + luma(b));
  let wc = 1.0 / (1.0 + luma(c));
  let wd = 1.0 / (1.0 + luma(d));
  return (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
}

// reach widens the taps when a level is more than half the size of its source.
fn downsample(uv: vec2f, first: bool, reach: f32) -> vec3f {
  let a = tap(uv, reach * vec2f(-2.0, -2.0));
  let b = tap(uv, reach * vec2f(0.0, -2.0));
  let c = tap(uv, reach * vec2f(2.0, -2.0));
  let d = tap(uv, reach * vec2f(-1.0, -1.0));
  let e = tap(uv, reach * vec2f(1.0, -1.0));
  let f = tap(uv, reach * vec2f(-2.0, 0.0));
  let g = tap(uv, reach * vec2f(0.0, 0.0));
  let h = tap(uv, reach * vec2f(2.0, 0.0));
  let i = tap(uv, reach * vec2f(-1.0, 1.0));
  let j = tap(uv, reach * vec2f(1.0, 1.0));
  let k = tap(uv, reach * vec2f(-2.0, 2.0));
  let l = tap(uv, reach * vec2f(0.0, 2.0));
  let m = tap(uv, reach * vec2f(2.0, 2.0));
  return karis(d, e, i, j, first) * 0.5
    + (karis(a, b, f, g, first) + karis(b, c, g, h, first)
      + karis(f, g, k, l, first) + karis(g, h, l, m, first)) * 0.125;
}

fn at(t: texture_2d<f32>, uv: vec2f, x: f32, y: f32) -> vec3f {
  return textureSampleLevel(t, linear, uv + vec2f(x, y) / vec2f(textureDimensions(t)), 0.0).rgb;
}

fn upsample(t: texture_2d<f32>, uv: vec2f) -> vec3f {
  return (at(t, uv, -1.0, -1.0) + at(t, uv, 1.0, -1.0) + at(t, uv, -1.0, 1.0) + at(t, uv, 1.0, 1.0)
    + 2.0 * (at(t, uv, 0.0, -1.0) + at(t, uv, -1.0, 0.0) + at(t, uv, 1.0, 0.0) + at(t, uv, 0.0, 1.0))
    + 4.0 * at(t, uv, 0.0, 0.0)) / 16.0;
}
`;

export const PREFILTER = /* wgsl */ `
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return vec4f(bright(downsample(uv, true, scene.view.w) * scene.extra.w), 1.0);
}
`;

export const DOWNSAMPLE = /* wgsl */ `
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return vec4f(downsample(uv, false, 1.0), 1.0);
}
`;

export const UPSAMPLE = /* wgsl */ `
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // Each smaller level is weighted a little more on its way up, for a long, soft tail.
  return vec4f(upsample(src, uv) * ${BLOOM_TAIL}, 1.0);
}
`;

// Tone mapping for a final pass: needs BLOOM (for luma).
export const TONE = /* wgsl */ `
// AgX (Troy Sobotka), fitted by Benjamin Wrensch: sRGB-linear in, sRGB-linear out.
fn agx(c: vec3f) -> vec3f {
  let inset = mat3x3f(
    vec3f(0.842479062253094, 0.0423282422610123, 0.0423756549057051),
    vec3f(0.0784335999999992, 0.878468636469772, 0.0784336),
    vec3f(0.0792237451477643, 0.0791661274605434, 0.879142973793104));
  let outset = mat3x3f(
    vec3f(1.19687900512017, -0.0528968517574562, -0.0529716355144438),
    vec3f(-0.0980208811401368, 1.15190312990417, -0.0980434501171241),
    vec3f(-0.0990297440797205, -0.0989611768448433, 1.15107367264116));
  let minEv = -12.47393;
  let maxEv = 4.026069;
  var x = inset * max(c, vec3f(1e-10));
  x = clamp((log2(x) - minEv) / (maxEv - minEv), vec3f(0.0), vec3f(1.0));
  let x2 = x * x;
  let x4 = x2 * x2;
  x = 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2
    + 0.1191 * x - 0.00232;
  // A restrained "punchy" look: AgX alone desaturates bright colour toward white too early.
  let y = luma(x);
  // The fit dips just below zero at black; pow() of a negative is undefined, so clamp first.
  x = y + 1.3 * (pow(max(x, vec3f(0.0)), vec3f(1.12)) - y);
  return max(pow(outset * x, vec3f(2.2)), vec3f(0.0));
}

fn encode(c: vec3f) -> vec3f { return pow(c, vec3f(1.0 / 2.2)); }
`;

// A fullscreen triangle for the post passes, with a top-origin uv, as texture coordinates run.
export const FULLSCREEN = /* wgsl */ `
struct Fullscreen {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vs_full(@builtin(vertex_index) i: u32) -> Fullscreen {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var out: Fullscreen;
  out.position = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  out.uv = vec2f(p.x, 1.0 - p.y);
  return out;
}
`;

export const HALF = "rgba16float" as const;
export const FLOAT = "rgba32float" as const;
export const ADDITIVE: GPUBlendState = {
  color: { srcFactor: "one", dstFactor: "one" },
  alpha: { srcFactor: "one", dstFactor: "one" },
};

/** The sum of a bloom chain's level weights: `(tail^levels - 1) / (tail - 1)`. */
export function bloomWeight(levels: number, tail: number): number {
  if (levels < 1) throw new RangeError("bloom levels must be >= 1");
  if (tail === 1) return levels;
  return (tail ** levels - 1) / (tail - 1);
}

/** One group-0 declaration read from WGSL. */
export interface WgslBinding {
  binding: number;
  name: string;
  /** `uniform` for `var<uniform>`, `sampler`, or `texture` for anything else. */
  kind: "uniform" | "sampler" | "texture";
  type: string;
}

/** Reads a shader's `@group(0) @binding(n) var ...` declarations, in source order. */
export function parseBindings(code: string): WgslBinding[] {
  const out: WgslBinding[] = [];
  for (const match of code.matchAll(
    /@group\(0\) @binding\((\d+)\) var(<uniform>)? (\w+)\s*:\s*([\w<>]+)/g,
  )) {
    const [, binding, uniform, name, type] = match;
    if (binding === undefined || name === undefined || type === undefined) continue;
    out.push({
      binding: Number(binding),
      name,
      type,
      kind: uniform ? "uniform" : type === "sampler" ? "sampler" : "texture",
    });
  }
  return out;
}

/**
 * Textures whose name matches this are bound as `unfilterable-float` (only ever loaded, e.g. a
 * 32-bit simulation state ping-pong `stateA`/`stateB`); all others as filterable `float`.
 */
export const DEFAULT_UNFILTERABLE = /^(state|src)[AB]$/;

/**
 * The bind group layout a shader declares, read from its group-0 declarations. Declared explicitly
 * so a binding one entry point does not use is still valid to set.
 */
function layoutOf(device: GPUDevice, code: string, unfilterable: RegExp): GPUBindGroupLayout {
  const visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
  const entries: GPUBindGroupLayoutEntry[] = parseBindings(code).map(({ binding, name, kind }) => {
    const base = { binding, visibility };
    if (kind === "uniform") return { ...base, buffer: { type: "uniform" } };
    if (kind === "sampler") return { ...base, sampler: { type: "filtering" } };
    return {
      ...base,
      texture: { sampleType: unfilterable.test(name) ? "unfilterable-float" : "float" },
    };
  });
  return device.createBindGroupLayout({ entries });
}

export interface OpenGpuOptions {
  /** Allow a software (fallback) adapter. Off by default: static art is kinder than CPU WebGPU. */
  allowFallbackAdapter?: boolean;
  /** Called once with the first uncaptured GPU error or device loss. Errors are also logged. */
  onError?: (error: Error) => void;
  alphaMode?: GPUCanvasAlphaMode;
}

export interface GpuHandle {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  /** Whether `timestamp-query` is available for measuring frame cost. */
  timed: boolean;
  /** Settles when the device is lost or reports an uncaptured error; the page should go static. */
  failed: Promise<void>;
  /** Marks the scene failed from caller code (e.g. a frame threw). */
  fail(error?: Error): void;
  close(): void;
}

/**
 * A hardware WebGPU device drawing to the canvas, premultiplied over the page. Throws without one,
 * so the caller keeps its static fallback. Any later GPU error or loss settles `failed` and is
 * reported through `onError` and the console.
 */
export async function openGpu(
  canvas: HTMLCanvasElement,
  options: OpenGpuOptions = {},
): Promise<GpuHandle> {
  if (typeof navigator === "undefined" || !("gpu" in navigator) || !navigator.gpu) {
    throw new Error("WebGPU is not available in this browser");
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("No WebGPU adapter");
  if (adapter.info?.isFallbackAdapter && !options.allowFallbackAdapter) {
    throw new Error("Only a software WebGPU adapter is available");
  }
  const timed = adapter.features.has("timestamp-query");
  const device = await adapter.requestDevice({
    requiredFeatures: timed ? ["timestamp-query"] : [],
  });
  const context = canvas.getContext("webgpu");
  if (!context) {
    device.destroy();
    throw new Error("No WebGPU canvas context");
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: options.alphaMode ?? "premultiplied" });

  let closed = false;
  let settled = false;
  let resolveFailed: () => void = () => undefined;
  const failed = new Promise<void>((resolve) => (resolveFailed = resolve));
  const fail = (error?: Error) => {
    if (settled) return;
    settled = true;
    if (error) {
      console.error("[@arsenal/fx] WebGPU scene failed:", error);
      options.onError?.(error);
    }
    resolveFailed();
  };
  device.addEventListener("uncapturederror", (event) => {
    fail(new Error(`WebGPU error: ${event.error.message}`));
  });
  void device.lost.then((info) => {
    // A deliberate destroy() from close() is not a failure worth reporting.
    if (closed && info.reason === "destroyed") return fail();
    fail(new Error(`WebGPU device lost (${info.reason}): ${info.message}`));
  });

  return {
    device,
    context,
    format,
    timed,
    failed,
    fail,
    close() {
      closed = true;
      context.unconfigure();
      device.destroy();
    },
  };
}

export interface PipelineOptions {
  /** Vertex entry point; `vs_main` by default. The fragment entry point is always `fs_main`. */
  vertex?: string;
  msaa?: boolean;
  depth?: boolean;
}

/** Pipelines, bind groups, textures and pass descriptors on one device. */
export function createKit(device: GPUDevice, unfilterable: RegExp = DEFAULT_UNFILTERABLE) {
  const layouts = new Map<string, GPUBindGroupLayout>();
  const pipeline = (
    code: string,
    targets: GPUColorTargetState[],
    options: PipelineOptions = {},
  ): Promise<GPURenderPipeline> => {
    const module = device.createShaderModule({ code });
    const layout = layoutOf(device, code, unfilterable);
    layouts.set(code, layout);
    return device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: { module, entryPoint: options.vertex ?? "vs_main" },
      fragment: { module, entryPoint: "fs_main", targets },
      primitive: { topology: "triangle-list" },
      ...(options.depth
        ? { depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" } }
        : {}),
      ...(options.msaa ? { multisample: { count: 4 } } : {}),
    });
  };
  return {
    pipeline,
    /** A fullscreen pass: the shader's fs_main over a triangle covering the target. */
    full: (code: string, targets: GPUColorTargetState[]) =>
      pipeline(code + FULLSCREEN, targets, { vertex: "vs_full" }),
    /** A bind group for a shader built above, its resources named as its WGSL declares them. */
    bind: (source: string, resources: Record<string, GPUBindingResource>): GPUBindGroup => {
      const layout = layouts.get(source) ?? layouts.get(source + FULLSCREEN);
      if (!layout) throw new Error("bind(): build a pipeline from this shader first");
      return device.createBindGroup({
        layout,
        entries: parseBindings(source).map(({ binding, name }) => {
          const resource = resources[name];
          if (!resource) throw new Error(`bind(): no resource for WGSL binding "${name}"`);
          return { binding, resource };
        }),
      });
    },
    texture: (size: [number, number], format: GPUTextureFormat, sampleCount = 1) =>
      device.createTexture({
        size,
        format,
        sampleCount,
        usage:
          GPUTextureUsage.RENDER_ATTACHMENT |
          (sampleCount === 1 ? GPUTextureUsage.TEXTURE_BINDING : 0),
      }),
    pass: (views: GPUTextureView[], load: GPULoadOp = "clear"): GPURenderPassDescriptor => ({
      colorAttachments: views.map((view) => ({
        view,
        loadOp: load,
        storeOp: "store" as const,
        clearValue: [0, 0, 0, 0],
      })),
    }),
  };
}

export type GpuKit = ReturnType<typeof createKit>;
