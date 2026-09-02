import { renditionHash } from "@/lib/content/hash";
import { normalizeNarration } from "@/lib/content/markdown";
import { LOCALE_LANG, type Locale, type Story } from "@/lib/content/types";
import { chunkParagraphs } from "./chunk";
import { estimateSeconds } from "./estimate";
import { PAUSE_MS } from "./pauses";
import { applyRespell, collectIpa, type PronunciationTable } from "./pronounce";
import type { NarrationPlan } from "./types";

export interface PrepareOptions {
  speakingRate: number;
  maxChunkBytes: number;
  maxChunkEstSeconds: number;
  pronunciations: PronunciationTable;
  /** Whether to attach IPA entries (only for locales where Chirp supports customPronunciations). */
  useIpa: boolean;
  collectionTitle: string;
}

export class PlanError extends Error {
  constructor(
    message: string,
    readonly code: "no_text" | "empty",
  ) {
    super(message);
  }
}

export function prepareNarration(story: Story, locale: Locale, voiceName: string, opts: PrepareOptions): NarrationPlan {
  const lang = LOCALE_LANG[locale];
  const text = story.texts[lang];
  if (!text) throw new PlanError(`story ${story.meta.id} has no ${lang} text`, "no_text");

  const prepareText = (s: string) => normalizeNarration(applyRespell(s, opts.pronunciations.respell));
  const { chunks, planParagraphs } = chunkParagraphs(text.paragraphs, lang, {
    maxBytes: opts.maxChunkBytes,
    maxEstSeconds: opts.maxChunkEstSeconds,
    speakingRate: opts.speakingRate,
    prepareText,
  });
  if (chunks.length === 0) throw new PlanError(`story ${story.meta.id} (${lang}) has no narratable text`, "empty");

  if (opts.useIpa && Object.keys(opts.pronunciations.ipa).length > 0) {
    for (const c of chunks) {
      const ipa = collectIpa(c.text, opts.pronunciations.ipa);
      if (ipa.length) c.ipa = ipa;
    }
  }

  const preparedParagraphs = text.paragraphs.map((p) =>
    p.kind === "break" ? "" : `${p.kind}:${prepareText(p.narration)}`,
  );
  const totalChars = chunks.reduce((n, c) => n + c.chars, 0);
  const totalBytes = chunks.reduce((n, c) => n + c.bytes, 0);
  const pauseSeconds = (PAUSE_MS.leadIn + PAUSE_MS.tail + chunks.reduce((n, c) => n + c.pauseAfterMs, 0)) / 1000;

  const sections: NarrationPlan["sections"] = text.paragraphs
    .filter((p) => p.kind === "heading")
    .map((p) => ({
      index: p.sectionIndex,
      title: p.narration,
      firstChunkIndex: planParagraphs[p.index].firstChunkIndex,
    }));
  if (sections.length === 0 || sections[0].index !== 0) sections.unshift({ index: 0, firstChunkIndex: 0 });

  return {
    storyId: story.meta.id,
    locale,
    lang,
    voiceName,
    speakingRate: opts.speakingRate,
    renditionHash: renditionHash({ preparedParagraphs, speakingRate: opts.speakingRate }),
    contentHash: text.contentHash,
    leadInMs: PAUSE_MS.leadIn,
    tailMs: PAUSE_MS.tail,
    chunks,
    paragraphs: planParagraphs,
    sections,
    totalChars,
    totalBytes,
    estimatedSeconds: Math.round(estimateSeconds(totalChars, lang, opts.speakingRate) + pauseSeconds),
    title: text.title,
    collectionTitle: opts.collectionTitle,
  };
}
