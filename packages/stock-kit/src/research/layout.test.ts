import { describe, expect, it } from "vitest";
import { layoutEvidence, type EvidenceItem } from "./layout.js";

describe("layoutEvidence", () => {
  it("is deterministic and keeps peers on the outer ring", () => {
    const items: EvidenceItem[] = [
      { id: "a", text: "A", kind: "bull", polarity: "positive" },
      { id: "p", text: "P", kind: "peer", polarity: "peer" },
    ];
    expect(layoutEvidence(items)).toEqual(layoutEvidence(items));
    const peer = layoutEvidence(items).find((item) => item.id === "p")!;
    expect(Math.hypot(peer.x - 50, peer.y - 50)).toBeCloseTo(43);
  });

  it("limits each evidence side without limiting peers", () => {
    const items: EvidenceItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: `b${i}`,
      text: `B${i}`,
      kind: "bull",
      polarity: "positive",
    }));
    expect(layoutEvidence(items)).toHaveLength(8);
  });

  it("keeps neutral evidence clear of the company node", () => {
    const [neutral] = layoutEvidence([
      { id: "n", text: "Neutral", kind: "signal", polarity: "neutral" },
    ]);
    expect(neutral).toMatchObject({ x: 50, y: 30 });
  });

  it("spaces a full side far enough apart that nodes and labels do not overlap", () => {
    const items: EvidenceItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: `b${i}`,
      text: `B${i}`,
      kind: "bull",
      polarity: "positive",
    }));
    const placed = layoutEvidence(items);
    for (let i = 1; i < placed.length; i++) {
      const a = placed[i - 1]!;
      const b = placed[i]!;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(7.5);
    }
    expect(placed.every((p) => p.x < 50)).toBe(true);
  });
});
