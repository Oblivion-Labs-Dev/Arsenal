
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform float uLight;
uniform float uOutage;
uniform vec4 uMods[7];
uniform float uRec[7];
uniform vec4 uPacket;

const vec2 PLATE = vec2(1672.0, 941.0);
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
}

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
}

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * PLATE;
  float t = uTime;
  float glowScale = mix(1.0, 0.45, uLight);

  // Lake: ripples spreading from under the core, stronger near the viewer.
  vec2 offset = vec2(0.0);
  float below = smoothstep(712.0, 726.0, p.y);
  vec2 rd = (p - vec2(1000.0, 716.0)) * vec2(0.28, 1.0);
  float rdist = length(rd);
  float depth = clamp((p.y - 712.0) / 220.0, 0.0, 1.0);
  float wave = sin(rdist * 0.11 - t * 1.6) * exp(-rdist * 0.012);
  float swell = fbm(vec2(p.x * 0.012 + t * 0.05, p.y * 0.05 - t * 0.12)) - 0.5;
  offset.x += below * (wave * 2.2 + swell * 5.0) * (0.4 + depth);
  offset.y += below * (wave * 1.2 + swell * 2.0) * (0.4 + depth);

  vec3 col = texture2D(uTex, clamp((p + offset) / PLATE, 0.0, 1.0)).rgb;
  float l = luma(col);

  // Concentric light rings on the water surface.
  float rings = pow(0.5 + 0.5 * sin(rdist * 0.11 - t * 1.6), 10.0) * exp(-rdist * 0.009);
  col += AMBER * rings * below * 0.16 * glowScale * (0.4 + l);

  // Waterfalls: bright streaks sliding down the lit water, mist drifting at the base.
  float falls = 0.0;
  falls = max(falls, inRect(p, vec4(898.0, 605.0, 1008.0, 722.0), 4.0));
  falls = max(falls, inRect(p, vec4(1036.0, 645.0, 1146.0, 735.0), 4.0));
  float flow = noise(vec2(p.x * 0.45, p.y * 0.035 - t * 2.6)) * 0.7 + noise(vec2(p.x * 0.9, p.y * 0.08 - t * 4.1)) * 0.3;
  float wet = smoothstep(0.32, 0.7, l);
  col += col * falls * wet * (flow - 0.45) * 0.85;
  float mistBand = smoothstep(705.0, 735.0, p.y) * (1.0 - smoothstep(745.0, 790.0, p.y));
  float mistX = smoothstep(880.0, 930.0, p.x) * (1.0 - smoothstep(1110.0, 1170.0, p.x));
  float mist = fbm(vec2(p.x * 0.018 - t * 0.08, p.y * 0.04 + t * 0.05)) * mistBand * mistX;
  col = mix(col, mix(vec3(0.92, 0.88, 0.8), vec3(1.0), uLight), mist * 0.22);

  // Orbit rings: light streaks travelling along the bright glass.
  vec2 sd = p - vec2(1130.0, 343.0);
  float sdist = length(sd);
  float ringZone = inRect(p, vec4(770.0, 118.0, 1452.0, 480.0), 40.0)
    * smoothstep(88.0, 102.0, sdist);
  float angle = atan(sd.y * 1.9, sd.x);
  float streak = pow(0.5 + 0.5 * sin(angle * 3.0 - t * 0.7), 14.0) + pow(0.5 + 0.5 * sin(angle * 2.0 + t * 0.45 + 1.3), 22.0);
  float glass = smoothstep(0.38, 0.75, l) * smoothstep(0.0, 0.12, col.r - col.b);
  // The light plate's cream sky is as bright and warm as the glass, so there the streaks
  // also need local contrast (a glass edge or highlight), or they tint the whole ring box.
  vec2 px = 6.0 / PLATE;
  vec2 uv = p / PLATE;
  float around = 0.25 * (luma(texture2D(uTex, uv + vec2(px.x, 0.0)).rgb) + luma(texture2D(uTex, uv - vec2(px.x, 0.0)).rgb)
    + luma(texture2D(uTex, uv + vec2(0.0, px.y)).rgb) + luma(texture2D(uTex, uv - vec2(0.0, px.y)).rgb));
  glass *= mix(1.0, smoothstep(0.015, 0.06, abs(l - around)), uLight);
  col += AMBER * streak * glass * ringZone * 0.55 * glowScale;

  // Orbiting lights: 3 rings, two lights each.
  float behind = 1.0 - smoothstep(86.0, 94.0, sdist);
  float orbit = 0.0;
  orbit += orbitLights(p, vec2(1110.0, 297.0), vec2(336.0, 85.0), -0.06981, t * 0.320 + 0.00, 1.0, behind);
  orbit += orbitLights(p, vec2(1130.0, 400.0), vec2(255.0, 85.0), -0.17453, t * -0.410 + 2.10, -1.0, behind);
  orbit += orbitLights(p, vec2(1110.0, 325.0), vec2(209.0, 118.0), 1.31772, t * 0.270 + 4.20, 1.0, behind);
  orbit *= 1.0 - uOutage * 0.6;
  // On the cream light plate an additive glow washes out, so the lights there take a deeper
  // orange and mix toward it instead of only adding.
  vec3 orbitDark = mix(AMBER, vec3(1.0, 0.93, 0.8), clamp(orbit - 0.8, 0.0, 1.0)) * orbit * 0.75;
  vec3 orbitLight = mix(col, vec3(0.95, 0.45, 0.08), clamp(orbit * 0.55, 0.0, 0.85)) - col;
  col += mix(orbitDark, orbitLight, uLight);

  // Core: gold nodes twinkle, the beam pulses down into the island.
  float core = 1.0 - smoothstep(80.0, 92.0, sdist);
  float twinkle = 0.5 + 0.5 * sin(t * 1.6 + noise(p * 0.045) * 9.0);
  col += col * core * smoothstep(0.45, 0.85, l) * (twinkle - 0.35) * 0.7 * glowScale;
  float bx = abs(p.x - 1148.0);
  float beamY = smoothstep(436.0, 448.0, p.y) * (1.0 - smoothstep(561.0, 576.0, p.y));
  float pulse = pow(0.5 + 0.5 * sin(p.y * 0.07 - t * 3.2), 6.0);
  col += AMBER * exp(-bx * bx / 14.0) * beamY * (0.15 + pulse * 0.45) * glowScale;

  // Outage: the whole scene loses a little light while a service is down.
  col *= 1.0 - uOutage * 0.18;

  // Modules: hover/selection glow, failure red with an expanding pulse, recovery calm.
  for (int i = 0; i < 7; i++) {
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
  }

  // Request packet.
  if (uPacket.z > 0.0) {
    float d = length(p - uPacket.xy);
    vec3 tint = mix(AMBER, RED, uPacket.w);
    float g = exp(-d * d / 60.0) * 1.1 + exp(-d * d / 900.0) * 0.4;
    col += tint * g * uPacket.z * mix(1.0, 0.75, uLight);
    col = mix(col, vec3(1.0, 0.97, 0.9), exp(-d * d / 10.0) * uPacket.z);
  }

  gl_FragColor = vec4(col, 1.0);
}