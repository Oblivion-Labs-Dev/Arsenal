/**
 * Blog-post Markdown: frontmatter, heading ids, table of contents and reading time
 * (from amsborse.github.io `utils/markdown.ts` + `utils/frontmatter.ts`).
 *
 * SECURITY: `marked` does not sanitize HTML. Only feed trusted, author-written Markdown into
 * `parsePostMarkdown`, or sanitize the returned `html` (e.g. DOMPurify) before rendering it.
 */
import { Marked, TextRenderer, type Tokens } from 'marked';

export type FrontmatterValue = string | boolean | string[];
export type TocItem = { id: string; text: string; level: 2 | 3 };

const unquote = (s: string): string => {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"'))
    return s.slice(1, -1).replace(/\\"/g, '"');
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
};

/**
 * Minimal YAML-ish frontmatter: `key: value` lines between `---` fences.
 * `[a, b]` becomes a string array, `true`/`false` become booleans, quotes are stripped.
 * Everything else stays a string (no numbers are guessed; callers convert explicitly).
 */
export function parseFrontmatter(raw: string): {
  data: Record<string, FrontmatterValue>;
  body: string;
} {
  let text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  text = text.trim();
  // No /m flag: ^ and $ must be start/end of file so the body can't steal the match.
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/.exec(text);
  if (!m) return { data: {}, body: text };
  const data: Record<string, FrontmatterValue> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (!line.trim() || colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (!key) continue;
    const list = /^\[(.*)\]$/.exec(val);
    if (list) {
      data[key] = list[1]!.trim() ? list[1]!.split(',').map((s) => unquote(s.trim())) : [];
    } else if (val === 'true' || val === 'false') {
      data[key] = val === 'true';
    } else {
      data[key] = unquote(val);
    }
  }
  return { data, body: m[2] ?? '' };
}

/** GitHub-style heading slug, unique within `used` (`intro`, `intro-2`, ...). */
export function slugifyHeading(text: string, used: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section';
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

export function estimateReadingMinutes(text: string, wordsPerMinute = 220): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

export interface ParsedPost {
  data: Record<string, FrontmatterValue>;
  /** `null` when the frontmatter has no string `title`. */
  title: string | null;
  description: string | null;
  date: string | null;
  tags: string[];
  html: string;
  toc: TocItem[];
  readingMinutes: number;
}

const str = (v: FrontmatterValue | undefined): string | null => (typeof v === 'string' ? v : null);

const decodeEntities = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

export function parsePostMarkdown(
  raw: string,
  options: { wordsPerMinute?: number } = {},
): ParsedPost {
  const { data, body } = parseFrontmatter(raw);
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const plain = new TextRenderer();
  // A per-call instance: no global marked state, and ids come from the real heading tokens.
  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      heading(token: Tokens.Heading) {
        if (token.depth !== 2 && token.depth !== 3) return false;
        const inner = this.parser.parseInline(token.tokens);
        const text = decodeEntities(this.parser.parseInline(token.tokens, plain)).trim();
        const id = slugifyHeading(text, used);
        toc.push({ id, text, level: token.depth });
        return `<h${token.depth} id="${id}">${inner}</h${token.depth}>\n`;
      },
    },
  });
  const html = md.parse(body, { async: false });
  const tags = Array.isArray(data.tags) ? data.tags : [];
  return {
    data,
    title: str(data.title),
    description: str(data.description),
    date: str(data.date),
    tags,
    html,
    toc,
    readingMinutes: estimateReadingMinutes(body, options.wordsPerMinute),
  };
}
