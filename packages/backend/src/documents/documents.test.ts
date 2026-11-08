import { describe, expect, it } from 'vitest';
import {
  ParseError,
  chunkText,
  detectFormat,
  extractDocument,
  extractIsolated,
  fromDocxHtml,
  normalizeText,
  sectionize,
  withinZipLimits,
} from './index.js';

const enc = (s: string) => new TextEncoder().encode(s);

/** A stored (uncompressed) zip with real local headers, central directory and end record. */
function buildZip(
  entries: Array<{ name: string; data: string; claimedSize?: number }>,
): Uint8Array {
  const locals: number[] = [];
  const central: number[] = [];
  const u16 = (out: number[], v: number) => out.push(v & 0xff, (v >> 8) & 0xff);
  const u32 = (out: number[], v: number) =>
    out.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff);
  for (const entry of entries) {
    const name = enc(entry.name);
    const data = enc(entry.data);
    const offset = locals.length;
    u32(locals, 0x04034b50);
    u16(locals, 20);
    u16(locals, 0);
    u16(locals, 0);
    u16(locals, 0);
    u16(locals, 0);
    u32(locals, 0);
    u32(locals, data.length);
    u32(locals, data.length);
    u16(locals, name.length);
    u16(locals, 0);
    locals.push(...name, ...data);
    u32(central, 0x02014b50);
    u16(central, 20);
    u16(central, 20);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u32(central, 0);
    u32(central, data.length);
    u32(central, entry.claimedSize ?? data.length);
    u16(central, name.length);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u16(central, 0);
    u32(central, 0);
    u32(central, offset);
    central.push(...name);
  }
  const end: number[] = [];
  u32(end, 0x06054b50);
  u16(end, 0);
  u16(end, 0);
  u16(end, entries.length);
  u16(end, entries.length);
  u32(end, central.length);
  u32(end, locals.length);
  u16(end, 0);
  return new Uint8Array([...locals, ...central, ...end]);
}

const docx = buildZip([
  { name: '[Content_Types].xml', data: '<Types/>' },
  { name: 'word/document.xml', data: '<w:document/>' },
]);

describe('detectFormat', () => {
  it('accepts files whose bytes match their name', () => {
    expect(detectFormat(enc('%PDF-1.7\n...'), 'cv.pdf')).toEqual({ ok: true, format: 'pdf' });
    expect(detectFormat(enc('Plain notes\nline two'), 'notes.md')).toEqual({
      ok: true,
      format: 'txt',
    });
    expect(detectFormat(docx, 'Report.DOCX')).toEqual({ ok: true, format: 'docx' });
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    expect(detectFormat(ole, 'old.doc')).toEqual({ ok: true, format: 'doc' });
  });

  it('refuses macros, unknown types, empty files and disguised content', () => {
    const refused = (bytes: Uint8Array, name: string) => {
      const d = detectFormat(bytes, name);
      expect(d.ok).toBe(false);
      return d.ok ? '' : d.reason;
    };
    expect(refused(docx, 'x.docm')).toMatch(/Macro-enabled/);
    expect(refused(enc('MZ'), 'x.exe')).toMatch(/Only PDF/);
    expect(refused(new Uint8Array(), 'x.txt')).toMatch(/empty/);
    expect(refused(enc('%PDF-1.4'), 'x.docx')).toMatch(/named \.docx/);
    expect(refused(new Uint8Array([0, 1, 2, 0xff, 0xfe, 0]), 'x.txt')).toMatch(/named \.txt/);
    const macro = buildZip([
      { name: 'word/document.xml', data: '<w:document/>' },
      { name: 'word/vbaProject.bin', data: 'x' },
    ]);
    expect(refused(macro, 'x.docx')).toMatch(/contains macros/);
  });

  it('checks zip sizes without inflating', () => {
    expect(withinZipLimits(docx)).toBe(true);
    const bomb = buildZip([
      { name: 'word/document.xml', data: 'x', claimedSize: 50 * 1024 * 1024 },
    ]);
    expect(withinZipLimits(bomb)).toBe(false);
    expect(withinZipLimits(enc('not a zip at all, just text padding here'))).toBe(false);
    expect(detectFormat(bomb, 'x.docx').ok).toBe(false);
  });
});

describe('text, sections and chunks', () => {
  it('normalizes whitespace', () => {
    expect(normalizeText('  a \r\nb c\n\n\n\nd  ')).toBe('a\nb c\n\nd');
  });

  it('finds headings and chunks within sections', () => {
    const text = normalizeText(
      [
        'EXPERIENCE',
        'Built a payments service.',
        '',
        'Led a migration.',
        '',
        'Skills:',
        'TypeScript, Go.',
      ].join('\n'),
    );
    const sections = sectionize(text);
    expect(sections.map((s) => s.heading)).toEqual(['EXPERIENCE', 'Skills']);
    expect(sections[1]!.end).toBe(text.length);

    const chunks = chunkText(text, sections, { target: 20 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const c of chunks) {
      expect(text.slice(c.start, c.end)).toContain(c.text.trim().slice(0, 5));
      const section = sections.find((s) => s.heading === c.heading)!;
      expect(c.start).toBeGreaterThanOrEqual(section.start);
      expect(c.end).toBeLessThanOrEqual(section.end);
    }
    expect(chunks.map((c) => c.ordinal)).toEqual(chunks.map((_, i) => i));
  });

  it('uses Word headings from docx HTML', () => {
    const doc = fromDocxHtml(
      '<h1>Summary</h1><p>Hello &amp; welcome</p><ul><li>One</li></ul><table><tr><td>a</td><td>b</td></tr></table>',
    );
    expect(doc.text).toBe('Summary\nHello & welcome\n• One\na | b');
    expect(doc.sections).toEqual([{ heading: 'Summary', start: 0, end: doc.text.length }]);
  });
});

describe('extractDocument', () => {
  it('decodes plain text without a parser', async () => {
    const doc = await extractDocument(enc('TITLE\nbody'), 'txt');
    expect(doc.text).toBe('TITLE\nbody');
  });

  it('throws ParseError when no parser is configured', async () => {
    await expect(extractDocument(enc('%PDF-'), 'pdf')).rejects.toBeInstanceOf(ParseError);
  });

  it('uses an injected parser with its own copy of the bytes', async () => {
    const original = enc('%PDF-');
    let received: Uint8Array | undefined;
    const doc = await extractDocument(original, 'pdf', {
      pdf: async (bytes) => {
        received = bytes;
        return 'Page one\r\n\r\n\r\nPage two';
      },
    });
    expect(doc.text).toBe('Page one\n\nPage two');
    expect(received).not.toBe(original);
  });
});

describe('extractIsolated', () => {
  const worker = (body: string) =>
    `const { parentPort, workerData } = require('node:worker_threads');\n${body}`;

  it('returns the worker result', async () => {
    const doc = await extractIsolated(enc('abc'), 'txt', {
      workerSource: worker(
        `const text = new TextDecoder().decode(workerData.bytes) + ':' + workerData.format;
         parentPort.postMessage({ ok: true, result: { text, sections: [] } });`,
      ),
    });
    expect(doc).toEqual({ text: 'abc:txt', sections: [] });
  });

  it('turns a worker failure into ParseError', async () => {
    await expect(
      extractIsolated(enc('abc'), 'txt', {
        workerSource: worker(`parentPort.postMessage({ ok: false, error: 'bad xref table' });`),
      }),
    ).rejects.toThrow(/could not be read \(bad xref table\)/);
  });

  it('kills a worker that runs too long', async () => {
    const error = await extractIsolated(enc('abc'), 'txt', {
      workerSource: worker('for (;;) {}'),
      timeoutMs: 300,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ParseError);
    expect((error as ParseError).message).toMatch(/took too long/);
  });
});
