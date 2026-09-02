import type { Lang, Locale, ParagraphKind } from "@/lib/content/types";

export interface IpaEntry {
  phrase: string;
  ipa: string;
}

export interface NarrationChunk {
  index: number;
  sectionIndex: number;
  paragraphIndex: number;
  /** Text sent to the TTS engine (after respelling). */
  text: string;
  bytes: number;
  chars: number;
  /** Digital silence appended after this chunk. */
  pauseAfterMs: number;
  ipa?: IpaEntry[];
}

export interface PlanParagraph {
  index: number;
  sectionIndex: number;
  kind: ParagraphKind;
  firstChunkIndex: number;
  lastChunkIndex: number;
}

export interface NarrationPlan {
  storyId: string;
  locale: Locale;
  lang: Lang;
  voiceName: string;
  speakingRate: number;
  renditionHash: string;
  contentHash: string;
  leadInMs: number;
  tailMs: number;
  chunks: NarrationChunk[];
  paragraphs: PlanParagraph[];
  sections: { index: number; title?: string; firstChunkIndex: number }[];
  totalChars: number;
  totalBytes: number;
  estimatedSeconds: number;
  /** Titles used for MP3 metadata. */
  title: string;
  collectionTitle: string;
}
