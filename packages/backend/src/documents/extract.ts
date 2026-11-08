// Turns a validated file into text plus sections. Ported from Kaka
// packages/documents/src/extract.ts. The binary parsers (unpdf, mammoth, word-extractor) are
// injected rather than imported, so this package carries no heavy parser dependencies; wire them
// in where they are installed, e.g.
//   pdf: async (b) => (await extractText(await getDocumentProxy(b), { mergePages: false })).text.join('\n\n')
//   docxHtml: async (b) => (await mammoth.convertToHtml({ buffer: Buffer.from(b) })).value
//   doc: async (b) => (await new WordExtractor().extract(Buffer.from(b))).getBody()
import type { FileFormat } from './detect.js';
import { normalizeText, sectionize, type ExtractedDocument } from './text.js';

/** A document could not be read. The message is safe to show to the user. */
export class ParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ParseError';
  }
}

export interface DocumentParsers {
  /** PDF bytes → plain text (pages joined by blank lines). Receives its own copy of the bytes. */
  pdf?: (bytes: Uint8Array) => Promise<string>;
  /** .docx bytes → simple HTML (h1-h6, p, li, tr/td), as mammoth's convertToHtml produces. */
  docxHtml?: (bytes: Uint8Array) => Promise<string>;
  /** Legacy .doc bytes → plain text. */
  doc?: (bytes: Uint8Array) => Promise<string>;
}

/**
 * Nothing here executes document content: parsers read text only, and plain text is decoded.
 * A format without a configured parser throws `ParseError`.
 */
export async function extractDocument(
  bytes: Uint8Array,
  format: FileFormat,
  parsers: DocumentParsers = {},
): Promise<ExtractedDocument> {
  switch (format) {
    case 'txt':
      return fromPlain(new TextDecoder('utf-8').decode(bytes));
    case 'pdf':
      // PDF.js transfers ownership of the buffer it is given, so it gets a copy.
      return fromPlain(await need(parsers.pdf, format)(new Uint8Array(bytes)));
    case 'docx':
      return fromDocxHtml(await need(parsers.docxHtml, format)(bytes));
    case 'doc':
      return fromPlain(await need(parsers.doc, format)(bytes));
  }
}

function need<T>(parser: T | undefined, format: FileFormat): T {
  if (!parser) throw new ParseError(`No parser configured for ${format} files.`);
  return parser;
}

function fromPlain(raw: string): ExtractedDocument {
  const text = normalizeText(raw);
  return { text, sections: sectionize(text) };
}

/**
 * Word files carry real heading styles, so they are used instead of guessing. The HTML is
 * simple and well-formed: headings, paragraphs, list items and tables, which become lines,
 * bullets and " | "-joined rows.
 */
export function fromDocxHtml(html: string): ExtractedDocument {
  const headings = new Set<string>();
  const lines: string[] = [];
  const blocks = html.match(/<(h[1-6]|p|li|tr)\b[^>]*>[\s\S]*?<\/\1>/g) ?? [];
  for (const block of blocks) {
    const tag = /^<(\w+)/.exec(block)![1]!;
    const content =
      tag === 'tr'
        ? (block.match(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/g) ?? []).map(inner).join(' | ')
        : inner(block);
    if (!content) continue;
    if (tag.startsWith('h')) {
      headings.add(content);
      lines.push('', content);
    } else {
      lines.push(tag === 'li' ? `• ${content}` : content);
    }
  }
  const text = normalizeText(lines.join('\n'));
  return { text, sections: sectionize(text, headings) };
}

function inner(block: string): string {
  return decodeEntities(block.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');
}
