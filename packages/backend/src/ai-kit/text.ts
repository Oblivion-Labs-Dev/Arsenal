// Prompt-safety and text helpers for model input/output, ported verbatim from Sutra packages/core/src/text.ts.
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Whitespace/case-insensitive check that a quote really appears in a source text. */
export function quoteInText(quote: string, text: string): boolean {
  const q = norm(quote);
  return q.length >= 12 && norm(text).includes(q);
}

/** Lowercased, punctuation-free form for comparing short strings. */
export function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Makes untrusted text safe to put inside a `<source>` fence by removing anything that could
 * close it. The fence plus a system prompt saying the contents are data is how every prompt
 * keeps web text from being read as instructions.
 */
export function fenceSource(text: string): string {
  return text.replace(/<\/?source[^>]*>/gi, "");
}

/**
 * Text addressed to a model rather than a reader: overriding instructions, role changes,
 * chat-format markers, requests to run something or to reveal a prompt. Returns what matched.
 * Web pages that merely discuss prompt injection will match too; that is the safe direction.
 */
const INSTRUCTION_LIKE = [
  /\b(ignore|disregard|forget|override)\s+(all\s+|any\s+|the\s+|your\s+)?(previous|prior|above|earlier|preceding|system)\s+(instructions?|prompts?|messages?|rules|context)/i,
  /\byou\s+are\s+now\s+(a|an|the|in)\b/i,
  /\bfrom\s+now\s+on,?\s+(you|always|only|respond|reply)\b/i,
  /\b(new|updated|real)\s+(system\s+)?instructions?\s*:/i,
  /\b(reveal|print|repeat|show)\s+(your|the)\s+(system\s+prompt|instructions|hidden\s+prompt)/i,
  /\byou\s+(must|should|will|shall)\s+(now\s+)?(act|behave|respond|reply|say|answer)\b/i,
  /\b(reply|respond|answer|output)\s+(only\s+)?(with|exactly)\b/i,
  /\b(run|execute)\s+(the\s+following|this)\s+(command|code|script)\b/i,
  /\b(call|invoke)\s+the\s+\w+\s+tool\b/i,
  /\b(rank|rate|score|mark)\s+(this|it)\s+(as\s+)?(first|highest|10|five\s+stars|high|important)\b/i,
  /<\|?(im_start|im_end|system|assistant|user)\|?>|\[\/?INST\]|###\s*(instruction|system)/i,
  /(^|\n)\s*(system|assistant)\s*:/i,
];

export function instructionLike(text: string): string[] {
  return INSTRUCTION_LIKE.flatMap((re) => re.exec(text)?.[0].trim() ?? []);
}

/** A text fragment matches a long quote by its first and last few words. */
const FRAGMENT_WORDS = 4;

/**
 * A link that opens a source at the exact quoted passage, with the browser's text fragment
 * (`#:~:text=`). Browsers without text fragments open the page as before. Null without a usable
 * http(s) URL.
 */
export function quoteLink(url: string | null, quote: string): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const words = quote.replace(/\s+/g, " ").trim().split(" ");
  // "-", "," and "&" are fragment syntax, so they are percent-encoded inside the text.
  const enc = (s: string) => encodeURIComponent(s).replace(/-/g, "%2D");
  const text =
    words.length <= FRAGMENT_WORDS * 2
      ? enc(words.join(" "))
      : `${enc(words.slice(0, FRAGMENT_WORDS).join(" "))},${enc(words.slice(-FRAGMENT_WORDS).join(" "))}`;
  u.hash = "";
  return `${u.toString()}#:~:text=${text}`;
}

/** HTML-escapes text for safe interpolation into email templates or HTML documents. */
export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
