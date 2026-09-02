import type { ContentIssue, Lang, Paragraph } from "./types";

const ZERO_WIDTH = /\u200B|\u200C|\u200D|\u2060|\uFEFF/g;
const CURLY_DOUBLE = /[“”„«»]/g;
const CURLY_SINGLE = /[‘’‚]/g;
const QUOTE_START = /^["'“‘«]/;
const EMOJI = /\p{Extended_Pictographic}/u;

/**
 * Normalize text for narration + hashing: NFC, no zero-width chars, straight quotes,
 * emphasis markers removed, whitespace collapsed.
 */
export function normalizeNarration(input: string): string {
  return input
    .normalize("NFC")
    .replace(ZERO_WIDTH, "")
    .replace(CURLY_DOUBLE, '"')
    .replace(CURLY_SINGLE, "'")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ParsedBody {
  paragraphs: Paragraph[];
  issues: ContentIssue[];
}

/**
 * Parse a story body written in the allowed Markdown subset into paragraphs.
 * Blank-line separated blocks are the unit; `## Heading` starts a section; `---` is a breath.
 */
export function parseBody(markdown: string, lang: Lang, file: string): ParsedBody {
  const issues: ContentIssue[] = [];
  const err = (message: string) => issues.push({ level: "error", file, message });
  const warn = (message: string) => issues.push({ level: "warn", file, message });

  const blocks = markdown
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const paragraphs: Paragraph[] = [];
  let sectionIndex = 0;
  let headingCount = 0;

  blocks.forEach((block, i) => {
    const where = `paragraph ${i + 1}`;

    if (/^-{3,}$/.test(block)) {
      paragraphs.push({
        index: paragraphs.length,
        sectionIndex,
        kind: "break",
        display: "",
        narration: "",
      });
      return;
    }

    let kind: Paragraph["kind"] = "text";
    let body = block;

    if (/^#/.test(block)) {
      if (/^##\s+\S/.test(block) && !/^###/.test(block)) {
        kind = "heading";
        body = block.replace(/^##\s+/, "");
        headingCount += 1;
        sectionIndex += 1;
      } else {
        err(`${where}: only "## Heading" is allowed for chapter headings`);
      }
    }

    if (/[[\]]/.test(body)) err(`${where}: square brackets are not allowed (Chirp may read them as markup)`);
    if (/https?:\/\/|www\./i.test(body)) err(`${where}: URLs are not allowed`);
    if (/<\/?[a-z!][^>]*>/i.test(body)) err(`${where}: HTML is not allowed`);
    if (kind !== "heading" && /^\s*([-*+]|\d+[.)])\s+/m.test(body)) err(`${where}: lists are not allowed`);
    if (/^\s*\|/m.test(body)) err(`${where}: tables are not allowed`);
    if (EMOJI.test(body)) err(`${where}: emoji are not allowed`);

    if (/\p{Nd}/u.test(body)) warn(`${where}: write numbers as words`);
    if (/;/.test(body)) warn(`${where}: avoid semicolons; split into two sentences`);
    if (/\b[A-Z]{3,}\b/.test(body)) warn(`${where}: avoid ALL CAPS words`);
    if (/\b(Mr|Mrs|Ms|Dr|St|Prof|etc)\./.test(body)) warn(`${where}: avoid abbreviations`);

    const display = body.replace(/\s*\n\s*/g, " ").trim();
    const narration = normalizeNarration(display);

    if (kind === "text" && QUOTE_START.test(narration) && narration.length < 160) kind = "dialogue";

    if (narration.length === 0) {
      err(`${where}: empty paragraph after normalization`);
      return;
    }
    if (narration.length > 1500) warn(`${where}: very long paragraph (${narration.length} chars); consider splitting`);

    for (const sentence of splitSentences(narration, lang)) {
      const bytes = Buffer.byteLength(sentence, "utf8");
      if (bytes > 3000) err(`${where}: a single sentence is ${bytes} bytes; split it (limit 3000)`);
    }

    paragraphs.push({
      index: paragraphs.length,
      sectionIndex,
      kind,
      display,
      narration,
    });
  });

  if (paragraphs.length === 0) err("story body is empty");
  if (headingCount === 1) warn("a single chapter heading is unusual; use none or at least two");

  return { paragraphs, issues };
}

const SENTENCE_FALLBACK = /(?<=[.!?।॥])\s+/u;

/** Sentence segmentation with Intl.Segmenter, falling back to punctuation splitting. */
export function splitSentences(text: string, lang: Lang): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    const seg = new Intl.Segmenter(lang, { granularity: "sentence" });
    const out: string[] = [];
    for (const s of seg.segment(trimmed)) {
      const t = s.segment.trim();
      if (t) out.push(t);
    }
    if (out.length > 0) return out;
  } catch {
    // fall through to the regex
  }
  return trimmed
    .split(SENTENCE_FALLBACK)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function countWords(paragraphs: Paragraph[]): number {
  let n = 0;
  for (const p of paragraphs) {
    if (!p.narration) continue;
    n += p.narration.split(/\s+/).filter(Boolean).length;
  }
  return n;
}

export function countChars(paragraphs: Paragraph[]): number {
  let n = 0;
  for (const p of paragraphs) n += [...p.narration].length;
  return n;
}
