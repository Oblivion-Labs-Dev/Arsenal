export type EvidenceItem = {
  id: string;
  text: string;
  kind: "bull" | "bear" | "signal" | "peer";
  polarity: "positive" | "negative" | "neutral" | "peer";
};

export type PositionedEvidence = EvidenceItem & { x: number; y: number };

/** Stable, bounded positions for the evidence constellation; all coordinates use a 100×100 viewBox. */
export function layoutEvidence(items: EvidenceItem[], limitPerSide = 8): PositionedEvidence[] {
  const visible = items
    .filter((item) => item.kind === "peer")
    .map((item, i, peers) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, peers.length);
      return { ...item, x: 50 + Math.cos(angle) * 43, y: 50 + Math.sin(angle) * 43 };
    });
  // Supporting evidence fans out on a left arc, opposing on a right arc, neutral signals on an
  // inner ring; arcs keep at least ~8 units between node centres so labels never collide.
  const arc = (centre: number, count: number) => {
    const spread = Math.min(Math.PI * 0.75, (count - 1) * 0.26);
    return (i: number) => centre - spread / 2 + (count > 1 ? (spread * i) / (count - 1) : 0);
  };
  for (const side of ["positive", "negative", "neutral"] as const) {
    const group = items.filter((item) => item.kind !== "peer" && item.polarity === side);
    const shown = group.slice(0, limitPerSide);
    const radius = side === "neutral" ? 20 : 31;
    const angleAt =
      side === "neutral"
        ? (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, shown.length)
        : arc(side === "positive" ? Math.PI : 0, shown.length);
    shown.forEach((item, i) => {
      const angle = angleAt(i);
      visible.push({
        ...item,
        x: Number((50 + Math.cos(angle) * radius).toFixed(3)),
        y: Number((50 + Math.sin(angle) * radius).toFixed(3)),
      });
    });
  }
  return visible;
}
