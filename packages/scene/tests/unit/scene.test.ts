import { describe, expect, it } from "vitest";
import { buildFragment, COMPONENTS, fitPlate, HERO_PLATE, orbitLightAt, orbitPoint } from "../../src";

describe("buildFragment", () => {
  it("includes one orbitLights call per orbit and one falls box per fall", () => {
    const src = buildFragment(HERO_PLATE);
    expect(src.match(/orbit \+= orbitLights\(/g)).toHaveLength(HERO_PLATE.orbits.length);
    expect(src.match(/falls = max\(falls, inRect/g)).toHaveLength(HERO_PLATE.falls.length);
  });

  it("follows the map: moving the sphere moves the shader", () => {
    const moved = { ...HERO_PLATE, sphere: { x: 500, y: 200, r: 60 } };
    const src = buildFragment(moved);
    expect(src).toContain("vec2 sd = p - vec2(500.0, 200.0);");
    expect(src).toContain("smoothstep(48.0, 60.0, sdist)");
  });

  it("leaves out components that are not asked for, helpers included", () => {
    const src = buildFragment(HERO_PLATE, { components: ["water", "sphere"] });
    expect(src).not.toContain("orbitLights");
    expect(src).not.toContain("float falls");
    expect(src).not.toContain("float beamY");
    expect(src).toContain("float twinkle");
  });

  it("only declares module uniforms when modules are used", () => {
    expect(buildFragment(HERO_PLATE)).not.toContain("uMods");
    expect(buildFragment(HERO_PLATE, { modules: 7 })).toContain("uniform vec4 uMods[7];");
  });

  it("rejects unknown component names loudly", () => {
    // @ts-expect-error testing a runtime guard
    expect(() => buildFragment(HERO_PLATE, { components: ["clouds"] })).toThrow(/unknown components clouds/);
  });

  it("exposes every component once", () => {
    const names = COMPONENTS.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(["water", "falls", "rings", "orbits", "sphere", "beam"]);
  });
});

describe("geometry", () => {
  it("orbits stay within the ring box horizontally (the tilted ring dips behind the island)", () => {
    const { rings } = HERO_PLATE;
    for (const o of HERO_PLATE.orbits) {
      for (let i = 0; i < 64; i++) {
        const pt = orbitPoint(o, (i / 64) * Math.PI * 2);
        expect(pt.x).toBeGreaterThan(rings.x0 - 20);
        expect(pt.x).toBeLessThan(rings.x1 + 20);
      }
    }
  });

  it("orbit lights move over time and in the orbit's direction", () => {
    const o = HERO_PLATE.orbits[1]!;
    const a = orbitLightAt(o, 1, 0);
    const b = orbitLightAt(o, 1, 1);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(20);
    expect(o.speed).toBeLessThan(0);
  });

  it("fitPlate keeps the focus rect visible on a phone and spans the width on desktop", () => {
    const phone = fitPlate(HERO_PLATE, 390, 844);
    const { focus } = HERO_PLATE;
    expect(phone.x + focus.x0 * phone.scale).toBeGreaterThanOrEqual(-0.5);
    expect(phone.x + focus.x1 * phone.scale).toBeLessThanOrEqual(390.5);
    const desk = fitPlate(HERO_PLATE, 1440, 900);
    expect(HERO_PLATE.width * desk.scale).toBeGreaterThanOrEqual(1440);
    expect(fitPlate(HERO_PLATE, 0, 900).scale).toBe(0);
  });
});
