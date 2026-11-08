/**
 * Each scene component is a slice of one fragment shader: optional helper functions
 * placed before main(), and statements placed in main() in a fixed order. Statements read
 * and write the shared locals declared by the frame: p, t, glowScale, col, l, below, rdist,
 * sdist. Components are pure functions of the scene map, so the same code serves any plate.
 */
import type { ComponentName, SceneMap } from "../types.js";

export const f = (n: number) => n.toFixed(1);

export interface ShaderComponent {
  name: ComponentName;
  helpers?: string;
  body: (map: SceneMap) => string;
}

/** Lake: concentric light rings on the water surface (the ripple offset itself is in the frame). */
export const water: ShaderComponent = {
  name: "water",
  body: () => `
  // Concentric light rings on the water surface.
  float rings = pow(0.5 + 0.5 * sin(rdist * 0.11 - t * 1.6), 10.0) * exp(-rdist * 0.009);
  col += AMBER * rings * below * 0.16 * glowScale * (0.4 + l);`,
};

/** Waterfalls: bright streaks sliding down the lit water, mist drifting at the base. */
export const falls: ShaderComponent = {
  name: "falls",
  body: (m) => `
  // Waterfalls: bright streaks sliding down the lit water, mist drifting at the base.
  float falls = 0.0;
  ${m.falls
    .map((r) => `falls = max(falls, inRect(p, vec4(${f(r.x0)}, ${f(r.y0)}, ${f(r.x1)}, ${f(r.y1)}), 4.0));`)
    .join("\n  ")}
  float flow = noise(vec2(p.x * 0.45, p.y * 0.035 - t * 2.6)) * 0.7 + noise(vec2(p.x * 0.9, p.y * 0.08 - t * 4.1)) * 0.3;
  float wet = smoothstep(0.32, 0.7, l);
  col += col * falls * wet * (flow - 0.45) * 0.85;
  float mistBand = smoothstep(${f(m.mist.y0)}, ${f(m.mist.y0 + 30)}, p.y) * (1.0 - smoothstep(${f(m.mist.y1 - 45)}, ${f(m.mist.y1)}, p.y));
  float mistX = smoothstep(${f(m.mist.x0)}, ${f(m.mist.x0 + 50)}, p.x) * (1.0 - smoothstep(${f(m.mist.x1 - 60)}, ${f(m.mist.x1)}, p.x));
  float mist = fbm(vec2(p.x * 0.018 - t * 0.08, p.y * 0.04 + t * 0.05)) * mistBand * mistX;
  col = mix(col, mix(vec3(0.92, 0.88, 0.8), vec3(1.0), uLight), mist * 0.22);`,
};

/** Ring streaks: light sweeping along the bright glass, gated by local contrast on light plates. */
export const rings: ShaderComponent = {
  name: "rings",
  body: (m) => `
  // Orbit rings: light streaks travelling along the bright glass.
  float ringZone = inRect(p, vec4(${f(m.rings.x0)}, ${f(m.rings.y0)}, ${f(m.rings.x1)}, ${f(m.rings.y1)}), 40.0)
    * smoothstep(${f(m.sphere.r - 4)}, ${f(m.sphere.r + 10)}, sdist);
  float angle = atan(sd.y * 1.9, sd.x);
  float streak = pow(0.5 + 0.5 * sin(angle * 3.0 - t * 0.7), 14.0) + pow(0.5 + 0.5 * sin(angle * 2.0 + t * 0.45 + 1.3), 22.0);
  float glass = smoothstep(0.38, 0.75, l) * smoothstep(0.0, 0.12, col.r - col.b);
  // A light plate's sky can be as bright and warm as the glass, so there the streaks
  // also need local contrast (a glass edge or highlight), or they tint the whole ring box.
  vec2 px = 6.0 / PLATE;
  vec2 uv = p / PLATE;
  float around = 0.25 * (luma(texture2D(uTex, uv + vec2(px.x, 0.0)).rgb) + luma(texture2D(uTex, uv - vec2(px.x, 0.0)).rgb)
    + luma(texture2D(uTex, uv + vec2(0.0, px.y)).rgb) + luma(texture2D(uTex, uv - vec2(0.0, px.y)).rgb));
  glass *= mix(1.0, smoothstep(0.015, 0.06, abs(l - around)), uLight);
  col += AMBER * streak * glass * ringZone * 0.55 * glowScale;`,
};

/** Orbit lights: two lights per ring with fading tails, dimmer on the far half and hidden behind the sphere. */
export const orbits: ShaderComponent = {
  name: "orbits",
  helpers: `
// Lights orbiting one glass ring: a hot head with a fading tail, dimmer on the far half
// and hidden where the far half passes behind the sphere.
float orbitLights(vec2 p, vec2 c, vec2 ab, float rot, float phase, float dir, float sphereMask) {
  float cr = cos(rot);
  float sr = sin(rot);
  vec2 d = p - c;
  vec2 q = vec2(cr * d.x + sr * d.y, -sr * d.x + cr * d.y) / ab;
  float len = max(length(q), 1e-4);
  float grad = length((q / len) / ab);
  float dist = abs(len - 1.0) / grad;
  float theta = atan(q.y, q.x);
  float total = 0.0;
  for (int k = 0; k < 2; k++) {
    float head = phase + float(k) * 3.14159;
    // delta < 0 is behind the head along its direction of travel.
    float delta = (mod(theta - head + 3.14159, 6.28318) - 3.14159) * dir;
    float tail = smoothstep(-0.95, 0.0, delta) * (1.0 - smoothstep(0.0, 0.035, delta));
    float core = exp(-delta * delta / 0.0012);
    total += tail * 0.55 + core * 1.6;
  }
  float far = step(q.y, 0.0);
  float across = exp(-dist * dist / 7.0) + exp(-dist * dist / 60.0) * 0.35;
  return total * across * mix(1.0, 0.45, far) * (1.0 - far * sphereMask);
}`,
  body: (m) => `
  // Orbiting lights: ${m.orbits.length} rings, two lights each.
  float behind = 1.0 - smoothstep(${f(m.sphere.r - 6)}, ${f(m.sphere.r + 2)}, sdist);
  float orbit = 0.0;
  ${m.orbits
    .map(
      (o, i) =>
        `orbit += orbitLights(p, vec2(${f(o.cx)}, ${f(o.cy)}), vec2(${f(o.a)}, ${f(o.b)}), ${((o.rot * Math.PI) / 180).toFixed(5)}, t * ${o.speed.toFixed(3)} + ${(i * 2.1).toFixed(2)}, ${o.speed < 0 ? "-1.0" : "1.0"}, behind);`
    )
    .join("\n  ")}
  orbit *= 1.0 - uOutage * 0.6;
  // On a cream light plate an additive glow washes out, so the lights there take a deeper
  // orange and mix toward it instead of only adding.
  vec3 orbitDark = mix(AMBER, vec3(1.0, 0.93, 0.8), clamp(orbit - 0.8, 0.0, 1.0)) * orbit * 0.75;
  vec3 orbitLight = mix(col, vec3(0.95, 0.45, 0.08), clamp(orbit * 0.55, 0.0, 0.85)) - col;
  col += mix(orbitDark, orbitLight, uLight);`,
};

/** Sphere: gold nodes on the core twinkle. */
export const sphere: ShaderComponent = {
  name: "sphere",
  body: (m) => `
  // Core: gold nodes twinkle.
  float core = 1.0 - smoothstep(${f(m.sphere.r - 12)}, ${f(m.sphere.r)}, sdist);
  float twinkle = 0.5 + 0.5 * sin(t * 1.6 + noise(p * 0.045) * 9.0);
  col += col * core * smoothstep(0.45, 0.85, l) * (twinkle - 0.35) * 0.7 * glowScale;`,
};

/** Island beam: a pulse travelling down from the core into the island. */
export const beam: ShaderComponent = {
  name: "beam",
  body: (m) => `
  // Beam: pulses down from the core into the island.
  float bx = abs(p.x - ${f(m.beam.x)});
  float beamY = smoothstep(${f(m.beam.y0)}, ${f(m.beam.y0 + 12)}, p.y) * (1.0 - smoothstep(${f(m.beam.y1 - 15)}, ${f(m.beam.y1)}, p.y));
  float pulse = pow(0.5 + 0.5 * sin(p.y * 0.07 - t * 3.2), 6.0);
  col += AMBER * exp(-bx * bx / 14.0) * beamY * (0.15 + pulse * 0.45) * glowScale;`,
};

/** Default draw order: water first, then what sits on top of it. */
export const COMPONENTS: readonly ShaderComponent[] = [water, falls, rings, orbits, sphere, beam];
