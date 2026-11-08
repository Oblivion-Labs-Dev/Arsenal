// Text normalization and heading detection. Ported from Kaka packages/documents/src/text.ts.
export interface Section {
  heading: string;
  /** Character range in the extracted text, heading included. */
  start: number;
  end: number;
}

export interface ExtractedDocument {
  text: string;
  sections: Section[];
}

/** One line per paragraph, no trailing spaces, at most one blank line in a row. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Builds sections from lines already known to be headings (Word styles), or
 * from lines that look like headings when the format has none (PDF, text).
 */
export function sectionize(text: string, knownHeadings?: Set<string>): Section[] {
  const starts: { heading: string; start: number }[] = [];
  let offset = 0;
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const previousBlank = index === 0 || lines[index - 1]!.trim() === '';
    const isHeading = knownHeadings
      ? knownHeadings.has(trimmed)
      : looksLikeHeading(trimmed, previousBlank);
    if (trimmed && isHeading)
      starts.push({ heading: trimmed.replace(/^#+\s*/, '').replace(/:$/, ''), start: offset });
    offset += line.length + 1;
  });
  return starts.map((s, i) => ({
    heading: s.heading,
    start: s.start,
    end: i + 1 < starts.length ? starts[i + 1]!.start : text.length,
  }));
}

/**
 * Short, unpunctuated lines that start a block: "EXPERIENCE", "## Projects",
 * "Payment Service Migration:", "Skills". Conservative on purpose — a missed
 * heading only makes a section longer, a false one splits a story in two.
 */
export function looksLikeHeading(line: string, startsBlock: boolean): boolean {
  if (!line || line.length > 70) return false;
  if (/^#{1,6}\s+\S/.test(line)) return true;
  if (!startsBlock) return false;
  if (/[.,;!?]$/.test(line) || /^[•\-*\d]/.test(line)) return false;
  const words = line.replace(/:$/, '').split(/\s+/);
  if (words.length > 8) return false;
  const letters = line.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true;
  if (line.endsWith(':')) return true;
  const capitalised = words.filter((w) => /^[A-Z0-9&]/.test(w)).length;
  return words.length <= 6 && capitalised / words.length >= 0.6;
}
