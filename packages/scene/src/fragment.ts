import { COMPONENTS, f, type ShaderComponent } from "./components/index.js";
import type { ComponentName, SceneMap } from "./types.js";

export const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export interface FragmentOptions {
  /** Glow points the host app drives through uMods/uRec (hover, failure, recovery). 0 disables them. */
  modules?: number;
  /** Components to include, in draw order. Defaults to all of them. */
  components?: readonly ComponentName[];
}

const PRELUDE = `
const vec3 AMBER = vec3(1.0, 0.68, 0.28);
const vec3 RED = vec3(1.0, 0.22, 0.16);
const vec3 SAGE = vec3(0.62, 0.92, 0.62);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float inRect(vec2 p, vec4 r, float soft) {
  vec2 a = smoothstep(r.xy - soft, r.xy + soft, p);
  vec2 b = 1.0 - smoothstep(r.zw - soft, r.zw + soft, p);
  return a.x * a.y * b.x * b.y;
}`;

const modulesBlock = (n: number) => `
  // Modules: hover/selection glow, failure red with an expanding pulse, recovery calm.
  for (int i = 0; i < ${n}; i++) {
    vec4 m = uMods[i];
    float d = length(p - m.xy);
    float halo = exp(-d * d / 1800.0);
    col += AMBER * halo * m.z * 0.55 * glowScale;
    if (m.w > 0.0) {
      float near = 1.0 - smoothstep(26.0, 52.0, d);
      float lum = luma(col);
      col = mix(col, RED * (0.35 + lum * 1.6) * mix(1.0, 0.85, uLight), near * m.w * 0.85);
      float wavefront = mod(t * 46.0, 70.0) + 22.0;
      float edge = exp(-pow((d - wavefront) / 3.2, 2.0)) * (1.0 - (wavefront - 22.0) / 70.0);
      col += RED * (edge * 0.7 + halo * 0.35) * m.w * mix(1.0, 0.7, uLight);
    }
    float rec = uRec[i];
    col += mix(SAGE, AMBER, 0.45) * halo * rec * 0.55 * glowScale;
  }`;

/**
 * Build the scene's single fragment shader for a plate. The frame samples the plate with
 * the lake's ripple offset; each component then adds its live layer on top.
 */
export function buildFragment(map: SceneMap, options: FragmentOptions = {}): string {
  const modules = options.modules ?? 0;
  const wanted = options.components ?? COMPONENTS.map((c) => c.name);
  const unknown = wanted.filter((n) => !COMPONENTS.some((c) => c.name === n));
  if (unknown.length) throw new Error(`arsenal-scene: unknown components ${unknown.join(", ")}`);
  const parts: ShaderComponent[] = wanted.map((n) => COMPONENTS.find((c) => c.name === n)!);
  const hasWater = wanted.includes("water");
  const h = map.horizonY;

  return `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform float uLight;
uniform float uOutage;
${modules > 0 ? `uniform vec4 uMods[${modules}];\nuniform float uRec[${modules}];` : ""}
uniform vec4 uPacket;

const vec2 PLATE = vec2(${f(map.width)}, ${f(map.height)});
${PRELUDE}
${parts.map((c) => c.helpers ?? "").join("\n")}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * PLATE;
  float t = uTime;
  float glowScale = mix(1.0, 0.45, uLight);

  // Lake: ripples spreading from under the core, stronger near the viewer.
  vec2 offset = vec2(0.0);
  float below = smoothstep(${f(h)}, ${f(h + 14)}, p.y);
  vec2 rd = (p - vec2(${f(map.ripple.x)}, ${f(map.ripple.y)})) * vec2(0.28, 1.0);
  float rdist = length(rd);
  ${
    hasWater
      ? `float depth = clamp((p.y - ${f(h)}) / 220.0, 0.0, 1.0);
  float wave = sin(rdist * 0.11 - t * 1.6) * exp(-rdist * 0.012);
  float swell = fbm(vec2(p.x * 0.012 + t * 0.05, p.y * 0.05 - t * 0.12)) - 0.5;
  offset.x += below * (wave * 2.2 + swell * 5.0) * (0.4 + depth);
  offset.y += below * (wave * 1.2 + swell * 2.0) * (0.4 + depth);`
      : ""
  }

  vec3 col = texture2D(uTex, clamp((p + offset) / PLATE, 0.0, 1.0)).rgb;
  float l = luma(col);
  vec2 sd = p - vec2(${f(map.sphere.x)}, ${f(map.sphere.y)});
  float sdist = length(sd);
${parts.map((c) => c.body(map)).join("\n")}

  // Outage: the whole scene loses a little light while a service is down.
  col *= 1.0 - uOutage * 0.18;
${modules > 0 ? modulesBlock(modules) : ""}

  // Request packet.
  if (uPacket.z > 0.0) {
    float d = length(p - uPacket.xy);
    vec3 tint = mix(AMBER, RED, uPacket.w);
    float g = exp(-d * d / 60.0) * 1.1 + exp(-d * d / 900.0) * 0.4;
    col += tint * g * uPacket.z * mix(1.0, 0.75, uLight);
    col = mix(col, vec3(1.0, 0.97, 0.9), exp(-d * d / 10.0) * uPacket.z);
  }

  gl_FragColor = vec4(col, 1.0);
}`;
}
