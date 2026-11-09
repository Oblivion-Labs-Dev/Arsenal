import { describe, expect, it } from "vitest";
import { COMPONENTS, HERO_PLATE, HERO_PLATE_PIECES, fitCrop } from "../../src";

describe("fitCrop", () => {
  it("fits the whole crop inside the container, centred", () => {
    const crop = { x0: 595, y0: 345, x1: 915, y1: 610 };
    for (const [w, h] of [[400, 320], [900, 300], [320, 640]] as const) {
      const fit = fitCrop(HERO_PLATE, crop, w, h);
      const left = fit.x + crop.x0 * fit.scale;
      const right = fit.x + crop.x1 * fit.scale;
      const top = fit.y + crop.y0 * fit.scale;
      const bottom = fit.y + crop.y1 * fit.scale;
      expect(left).toBeGreaterThanOrEqual(-0.01);
      expect(right).toBeLessThanOrEqual(w + 0.01);
      expect(top).toBeGreaterThanOrEqual(-0.01);
      expect(bottom).toBeLessThanOrEqual(h + 0.01);
      expect(Math.max(right - left, bottom - top)).toBeGreaterThan(0);
      // Touches the container on at least one axis (it is zoomed as far as it can go).
      expect(Math.min(Math.abs(right - left - w), Math.abs(bottom - top - h))).toBeLessThan(0.01);
    }
  });

  it("never leaves an empty edge when the zoomed plate covers the container", () => {
    const fit = fitCrop(HERO_PLATE, { x0: 0, y0: 0, x1: 200, y1: 200 }, 400, 400);
    expect(fit.x).toBeLessThanOrEqual(0);
    expect(fit.y).toBeLessThanOrEqual(0);
    expect(fit.x + HERO_PLATE.width * fit.scale).toBeGreaterThanOrEqual(400);
  });

  it("returns a zero fit for an empty container or crop", () => {
    expect(fitCrop(HERO_PLATE, { x0: 0, y0: 0, x1: 10, y1: 10 }, 0, 100).scale).toBe(0);
    expect(fitCrop(HERO_PLATE, { x0: 5, y0: 5, x1: 5, y1: 10 }, 100, 100).scale).toBe(0);
  });
});

describe("HERO_PLATE_PIECES", () => {
  it("every piece is a real region of the plate with known live layers", () => {
    const known = new Set(COMPONENTS.map((c) => c.name));
    expect(Object.keys(HERO_PLATE_PIECES)).toHaveLength(9);
    for (const piece of Object.values(HERO_PLATE_PIECES)) {
      const { crop } = piece;
      expect(crop.x0).toBeGreaterThanOrEqual(0);
      expect(crop.y0).toBeGreaterThanOrEqual(0);
      expect(crop.x1).toBeLessThanOrEqual(HERO_PLATE.width);
      expect(crop.y1).toBeLessThanOrEqual(HERO_PLATE.height);
      expect(crop.x1).toBeGreaterThan(crop.x0);
      expect(crop.y1).toBeGreaterThan(crop.y0);
      for (const name of piece.components) expect(known.has(name)).toBe(true);
    }
  });
});
