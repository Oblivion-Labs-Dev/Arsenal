// Section-aware retrieval chunks. Ported from Kaka packages/documents/src/chunk.ts.
import type { Section } from './text.js';

export interface Chunk {
  ordinal: number;
  heading: string | null;
  text: string;
  /** Range in the full extracted text, so a chunk can be traced back to its source. */
  start: number;
  end: number;
}

/**
 * Retrieval units of roughly `target` characters. Chunks break on paragraph
 * boundaries and never cross a section, so a chunk is about one thing and
 * carries the heading it sits under.
 */
export function chunkText(
  text: string,
  sections: Section[],
  options: { target?: number } = {},
): Chunk[] {
  const target = options.target ?? 1200;
  const ranges: { heading: string | null; start: number; end: number }[] =
    sections.length > 0
      ? [
          ...(sections[0]!.start > 0 ? [{ heading: null, start: 0, end: sections[0]!.start }] : []),
          ...sections,
        ]
      : [{ heading: null, start: 0, end: text.length }];

  const chunks: Chunk[] = [];
  for (const range of ranges) {
    let chunkStart = range.start;
    let cursor = range.start;
    while (cursor < range.end) {
      const next = text.indexOf('\n\n', cursor);
      const paragraphEnd = next === -1 || next > range.end ? range.end : next + 2;
      const tooLong = paragraphEnd - chunkStart > target && cursor > chunkStart;
      if (tooLong) {
        push(chunks, text, range.heading, chunkStart, cursor);
        chunkStart = cursor;
      }
      cursor = paragraphEnd;
    }
    push(chunks, text, range.heading, chunkStart, range.end);
  }
  return chunks;
}

function push(
  chunks: Chunk[],
  text: string,
  heading: string | null,
  start: number,
  end: number,
): void {
  const body = text.slice(start, end).trim();
  if (!body) return;
  const leading = text.slice(start, end).length - text.slice(start, end).trimStart().length;
  chunks.push({
    ordinal: chunks.length,
    heading,
    text: body,
    start: start + leading,
    end: start + leading + body.length,
  });
}
