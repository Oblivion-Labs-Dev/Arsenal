import { describe, expect, it } from 'vitest';
import { CHAPTERS, chapterScene, contourLevels, contours } from './chapterScenes';
import { cutRibbons } from './engraving';

const ASPECT = 1672 / 941;

/** Mean tone over a grid, and how many grid points differ from another scene. */
function sample(tone: (x: number, y: number) => number) {
  const values: number[] = [];
  for (let y = 0.02; y < 1; y += 0.04)
    for (let x = 0.02; x < ASPECT; x += 0.04) values.push(tone(x, y));
  return values;
}

describe('chapter scenes', () => {
  it('draws every chapter as its own picture, inside the tone range', () => {
    const pictures = CHAPTERS.map((chapter) => sample(chapterScene(chapter, ASPECT).tone));
    for (const values of pictures) {
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      // Real contrast: both near-paper and heavy ink appear.
      expect(Math.min(...values)).toBeLessThan(0.15);
      expect(Math.max(...values)).toBeGreaterThan(0.7);
    }
    for (let i = 0; i < pictures.length; i += 1) {
      for (let j = i + 1; j < pictures.length; j += 1) {
        const differing = pictures[i].filter((v, k) => Math.abs(v - pictures[j][k]) > 0.15).length;
        expect(differing / pictures[i].length, `${CHAPTERS[i]} vs ${CHAPTERS[j]}`).toBeGreaterThan(
          0.12,
        );
      }
    }
  });

  it('keeps each subject right of centre, clear of the chapter copy', () => {
    for (const chapter of CHAPTERS) {
      const { tone } = chapterScene(chapter, ASPECT, 0);
      // Detail = how much the tone changes across a small step, summed per half.
      let left = 0;
      let right = 0;
      for (let y = 0.05; y < 0.95; y += 0.01) {
        for (let x = 0.01; x < ASPECT - 0.01; x += 0.01) {
          const change = Math.abs(tone(x + 0.01, y) - tone(x, y));
          if (x < ASPECT * 0.4) left += change;
          else if (x > ASPECT * 0.5) right += change;
        }
      }
      expect(right, chapter).toBeGreaterThan(left);
    }
  });

  it('is deterministic, so a plate prints the same on every visit', () => {
    const a = sample(chapterScene('projects', ASPECT).tone);
    const b = sample(chapterScene('projects', ASPECT).tone);
    expect(b).toEqual(a);
  });

  it('cuts into engraved ribbons through the shared burin', () => {
    const lines = cutRibbons(chapterScene('learning', ASPECT), { spacing: 0.02, step: 0.01 });
    expect(lines.length).toBeGreaterThan(45);
    expect(lines.flat().length).toBeGreaterThan(lines.length);
  });
});

describe('contours', () => {
  const disc = {
    aspect: 1,
    tone: (x: number, y: number) => (Math.hypot(x - 0.5, y - 0.5) < 0.3 ? 1 : 0),
  };
  const ramp = { aspect: 1, tone: (x: number, y: number) => Math.hypot(x - 0.5, y - 0.5) };

  it('traces a level set where the tone crosses it', () => {
    const segments = contours(ramp, 0.3, 40, 40);
    expect(segments.length).toBeGreaterThan(40);
    for (const [x1, y1, x2, y2] of segments) {
      expect(Math.hypot(x1 - 0.5, y1 - 0.5)).toBeCloseTo(0.3, 2);
      expect(Math.hypot(x2 - 0.5, y2 - 0.5)).toBeCloseTo(0.3, 2);
    }
  });

  it('draws nothing on a flat field and a closed outline around a shape', () => {
    expect(contours({ aspect: 1, tone: () => 0.5 }, 0.3, 20, 20)).toEqual([]);
    const outline = contours(disc, 0.5, 50, 50);
    const length = outline.reduce((sum, [x1, y1, x2, y2]) => sum + Math.hypot(x2 - x1, y2 - y1), 0);
    // A circle of radius 0.3 is about 1.88 long; grid cells cut corners, never double it.
    expect(length).toBeGreaterThan(1.6);
    expect(length).toBeLessThan(2.2);
  });

  it('samples the field once for many levels, so a survey plate never freezes the page', () => {
    let calls = 0;
    const counted = {
      aspect: 1,
      tone: (x: number, y: number) => {
        calls += 1;
        return ramp.tone(x, y);
      },
    };
    const levels = [0.2, 0.35, 0.5];
    const all = contourLevels(counted, levels, 40, 40);
    expect(calls).toBe(41 * 41);
    levels.forEach((level, index) => expect(all[index]).toEqual(contours(ramp, level, 40, 40)));
  });
});
