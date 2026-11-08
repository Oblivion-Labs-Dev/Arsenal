/**
 * Real-GPU checks in Chromium: the package's shader compiles for every component subset,
 * and for the hero preset it draws the same pixels as the shader the live
 * amsborse.github.io hero ships (tests/fixtures/hero-fragment.glsl, exported from it).
 */
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { buildFragment, VERTEX, HERO_PLATE } from "../../src";

const fixture = (name: string) => new URL(`../fixtures/${name}`, import.meta.url);
const HERO_FRAGMENT = readFileSync(fixture("hero-fragment.glsl"), "utf8");
const plateData = (theme: string) =>
  `data:image/webp;base64,${readFileSync(fixture(`plate-${theme}-960.webp`)).toString("base64")}`;

interface Case {
  time: number;
  light: boolean;
  outage: number;
  modules: number[];
  recovery: number[];
  packet: number[];
}

/** Render one frame per case with the given fragment source; returns RGBA bytes per case. */
async function renderFrames(page: Page, fragment: string, image: string, cases: Case[]) {
  return page.evaluate(
    async ({ vertex, fragment, image, cases }) => {
      const img = new Image();
      img.src = image;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = 270;
      const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "compile");
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertex));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      for (const [k, v] of [
        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
        [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
      ] as const)
        gl.texParameteri(gl.TEXTURE_2D, k, v);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      const u = (n: string) => gl.getUniformLocation(prog, n);
      gl.viewport(0, 0, 480, 270);
      const out: string[] = [];
      for (const c of cases) {
        gl.uniform1f(u("uTime"), c.time);
        gl.uniform1f(u("uLight"), c.light ? 1 : 0);
        gl.uniform1f(u("uOutage"), c.outage);
        if (u("uMods")) gl.uniform4fv(u("uMods"), new Float32Array(c.modules));
        if (u("uRec")) gl.uniform1fv(u("uRec"), new Float32Array(c.recovery));
        gl.uniform4fv(u("uPacket"), new Float32Array(c.packet));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const px = new Uint8Array(480 * 270 * 4);
        gl.readPixels(0, 0, 480, 270, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let bin = "";
        for (let k = 0; k < px.length; k += 0x8000) bin += String.fromCharCode(...px.subarray(k, k + 0x8000));
        out.push(btoa(bin));
      }
      return out;
    },
    { vertex: VERTEX, fragment, image, cases }
  ).then((frames) => frames.map((b64) => new Uint8Array(Buffer.from(b64, "base64"))));
}

const mods = (fail: number) => {
  const m = new Array(28).fill(0);
  m.splice(0, 4, 923, 243, 1, 0); // highlighted ring module
  m.splice(4, 4, 1399, 416, 0, fail); // failing ring module
  return m;
};

const CASES: Case[] = [
  { time: 4, light: false, outage: 0, modules: new Array(28).fill(0), recovery: new Array(7).fill(0), packet: [0, 0, 0, 0] },
  { time: 11.3, light: false, outage: 0.7, modules: mods(1), recovery: [0, 0, 1, 0, 0, 0, 0], packet: [1050, 500, 1, 0] },
  { time: 6.5, light: true, outage: 0, modules: mods(0), recovery: new Array(7).fill(0), packet: [1200, 300, 0.8, 1] },
];

for (const theme of ["dark", "light"] as const) {
  test(`hero preset draws the same pixels as the live hero shader (${theme})`, async ({ page }) => {
    await page.goto("about:blank");
    const cases = CASES.filter((c) => c.light === (theme === "light") || c.time === 4).map((c) => ({
      ...c,
      light: theme === "light",
    }));
    const ours = await renderFrames(page, buildFragment(HERO_PLATE, { modules: 7 }), plateData(theme), cases);
    const theirs = await renderFrames(page, HERO_FRAGMENT, plateData(theme), cases);
    ours.forEach((frame, i) => {
      const ref = theirs[i]!;
      let maxDiff = 0;
      let lit = 0;
      for (let k = 0; k < frame.length; k++) {
        maxDiff = Math.max(maxDiff, Math.abs(frame[k]! - ref[k]!));
        if (k % 4 === 0 && frame[k]! > 20) lit++;
      }
      expect(lit, "frame is not blank").toBeGreaterThan(1000);
      expect(maxDiff, `case ${i} max channel difference`).toBeLessThanOrEqual(1);
    });
  });
}

test("orbit lights actually move between frames", async ({ page }) => {
  await page.goto("about:blank");
  const base = CASES[0]!;
  const src = buildFragment(HERO_PLATE, { components: ["orbits"] });
  const [a, b] = await renderFrames(page, src, plateData("dark"), [base, { ...base, time: 5 }]);
  let changed = 0;
  for (let k = 0; k < a!.length; k += 4) if (Math.abs(a![k]! - b![k]!) > 8) changed++;
  expect(changed).toBeGreaterThan(200);
});

test("every single component compiles on its own", async ({ page }) => {
  await page.goto("about:blank");
  for (const name of ["water", "falls", "rings", "orbits", "sphere", "beam"] as const) {
    const src = buildFragment(HERO_PLATE, { components: [name] });
    const frames = await renderFrames(page, src, plateData("dark"), [CASES[0]!]);
    expect(frames, name).toHaveLength(1);
  }
});
