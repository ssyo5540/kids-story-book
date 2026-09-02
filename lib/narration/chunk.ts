import { splitSentences } from "@/lib/content/markdown";
import type { Lang, Paragraph } from "@/lib/content/types";
import { estimateSeconds } from "./estimate";
import { PAUSE_MS, pauseAfterParagraph } from "./pauses";
import type { NarrationChunk, PlanParagraph } from "./types";

export interface ChunkOptions {
  maxBytes: number;
  maxEstSeconds: number;
  speakingRate: number;
  /** Applied to each paragraph's narration before chunking (e.g. respelling). */
  prepareText?: (text: string) => string;
}

const bytesOf = (s: string) => Buffer.byteLength(s, "utf8");

/** Split an over-long sentence at soft punctuation, then at whitespace, then hard at grapheme boundaries. */
export function splitLongSentence(sentence: string, maxBytes: number, lang: Lang): string[] {
  if (bytesOf(sentence) <= maxBytes) return [sentence];
  const trySplit = (parts: string[]): string[] | null => {
    const out: string[] = [];
    let cur = "";
    for (const part of parts) {
      const candidate = cur ? `${cur} ${part}` : part;
      if (bytesOf(candidate) <= maxBytes) cur = candidate;
      else {
        if (cur) out.push(cur);
        if (bytesOf(part) > maxBytes) return null;
        cur = part;
      }
    }
    if (cur) out.push(cur);
    return out;
  };
  const soft = sentence.split(/(?<=[,;:])\s+/u);
  const bySoft = soft.length > 1 ? trySplit(soft) : null;
  if (bySoft) return bySoft;
  const byWord = trySplit(sentence.split(/\s+/));
  if (byWord) return byWord;
  // Last resort: hard split on grapheme clusters (never inside a combining sequence).
  const seg = new Intl.Segmenter(lang, { granularity: "grapheme" });
  const out: string[] = [];
  let cur = "";
  for (const g of seg.segment(sentence)) {
    if (bytesOf(cur + g.segment) > maxBytes) {
      out.push(cur);
      cur = "";
    }
    cur += g.segment;
  }
  if (cur) out.push(cur);
  return out;
}

export function chunkParagraphs(
  paragraphs: Paragraph[],
  lang: Lang,
  opts: ChunkOptions,
): { chunks: NarrationChunk[]; planParagraphs: PlanParagraph[] } {
  const chunks: NarrationChunk[] = [];
  const planParagraphs: PlanParagraph[] = [];
  let pendingPause = 0; // pause carried from a break paragraph onto the previous chunk

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const p = paragraphs[pi];
    const next = paragraphs[pi + 1];

    if (p.kind === "break") {
      if (chunks.length > 0) chunks[chunks.length - 1].pauseAfterMs += PAUSE_MS.break;
      else pendingPause += PAUSE_MS.break;
      planParagraphs.push({
        index: p.index,
        sectionIndex: p.sectionIndex,
        kind: p.kind,
        firstChunkIndex: -1,
        lastChunkIndex: -1,
      });
      continue;
    }

    const text = opts.prepareText ? opts.prepareText(p.narration) : p.narration;
    const sentences = splitSentences(text, lang).flatMap((s) => splitLongSentence(s, opts.maxBytes, lang));

    const first = chunks.length;
    let cur: string[] = [];
    const flush = (pause: number) => {
      if (cur.length === 0) return;
      const t = cur.join(" ");
      chunks.push({
        index: chunks.length,
        sectionIndex: p.sectionIndex,
        paragraphIndex: p.index,
        text: t,
        bytes: bytesOf(t),
        chars: [...t].length,
        pauseAfterMs: pause,
      });
      cur = [];
    };
    for (const s of sentences) {
      const candidate = [...cur, s].join(" ");
      const tooBig =
        bytesOf(candidate) > opts.maxBytes ||
        estimateSeconds([...candidate].length, lang, opts.speakingRate) > opts.maxEstSeconds;
      if (cur.length > 0 && tooBig) flush(PAUSE_MS.intraParagraph);
      cur.push(s);
    }
    flush(pauseAfterParagraph(p.kind, next?.kind));

    if (chunks.length > first && pendingPause) {
      // a break before the very first paragraph becomes extra lead-in silence handled by the caller via leadIn; drop here
      pendingPause = 0;
    }
    planParagraphs.push({
      index: p.index,
      sectionIndex: p.sectionIndex,
      kind: p.kind,
      firstChunkIndex: chunks.length > first ? first : -1,
      lastChunkIndex: chunks.length > first ? chunks.length - 1 : -1,
    });
  }

  if (chunks.length > 0) chunks[chunks.length - 1].pauseAfterMs = 0; // tail silence is added separately
  return { chunks, planParagraphs };
}
