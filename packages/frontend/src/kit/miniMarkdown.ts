/**
 * A tiny, safe Markdown subset parser that returns data, never HTML (from Sutra `legal-markdown.ts`).
 * Supports headings, paragraphs, lists, tables, bold, inline code, links and `[placeholder]` gaps.
 * Render the blocks with your own components; nothing is ever injected as raw HTML.
 */

export type MiniBlock =
  | { kind: 'h1' | 'h2' | 'h3' | 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] };

export type MiniInline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string }
  /** A `[bracketed]` placeholder: shown as-is, never filled in. */
  | { kind: 'gap'; text: string };

export interface MiniMarkdownOptions {
  /** Stop at the first horizontal rule (`---`), e.g. to drop author notes. Default false. */
  stopAtRule?: boolean;
  /** Skip `>` block quotes entirely. Default false (quotes become paragraphs). */
  skipBlockquotes?: boolean;
}

const LIST_ITEM = /^(\s*)(?:[-*]|(\d+)\.)\s+(.*)$/;
const RULE = /^-{3,}\s*$/;

const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());

export function parseMiniMarkdown(source: string, options: MiniMarkdownOptions = {}): MiniBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MiniBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (RULE.test(line)) {
      if (options.stopAtRule) break;
      i++;
      continue;
    }
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('>'))
        quote.push(lines[i++]!.replace(/^>\s?/, '').trim());
      if (!options.skipBlockquotes)
        blocks.push({ kind: 'p', text: quote.filter(Boolean).join(' ') });
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      blocks.push({
        kind: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3',
        text: heading[2]!.trim(),
      });
      i++;
      continue;
    }
    if (line.trim().startsWith('|')) {
      const table: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('|')) table.push(cells(lines[i++]!));
      const [head = [], , ...rows] = table;
      blocks.push({ kind: 'table', head, rows });
      continue;
    }
    const first = LIST_ITEM.exec(line);
    if (first) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.trim()) {
        const item = LIST_ITEM.exec(lines[i]!);
        if (item) items.push(item[3]!.trim());
        else items[items.length - 1] += ` ${lines[i]!.trim()}`;
        i++;
      }
      blocks.push({ kind: first[2] ? 'ol' : 'ul', items });
      continue;
    }
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^(#{1,3}\s|>|\|)/.test(lines[i]!.trim()) &&
      !RULE.test(lines[i]!) &&
      !LIST_ITEM.exec(lines[i]!)
    )
      paragraph.push(lines[i++]!.trim());
    if (paragraph.length === 0) {
      // A line no block accepts (e.g. "#tag"): keep it as text rather than looping forever.
      paragraph.push(lines[i++]!.trim());
    }
    blocks.push({ kind: 'p', text: paragraph.join(' ') });
  }
  return blocks;
}

const INLINE = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)|\[([^\]]+)\]/g;
/** Same-site paths, https and mailto only; anything else (javascript:, data:, //host) becomes text. */
export const SAFE_HREF = /^(\/(?!\/)|https:\/\/|mailto:|#)/;

export function parseInline(
  text: string,
  isSafeHref: (href: string) => boolean = (h) => SAFE_HREF.test(h),
): MiniInline[] {
  const out: MiniInline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ kind: 'text', text: text.slice(last, index) });
    const [whole, strong, code, linkText, href, gap] = match;
    if (strong !== undefined) out.push({ kind: 'strong', text: strong });
    else if (code !== undefined) out.push({ kind: 'code', text: code });
    else if (linkText !== undefined && href !== undefined)
      out.push(
        isSafeHref(href)
          ? { kind: 'link', text: linkText, href }
          : { kind: 'text', text: linkText },
      );
    else if (gap !== undefined) out.push({ kind: 'gap', text: whole });
    last = index + whole.length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}
