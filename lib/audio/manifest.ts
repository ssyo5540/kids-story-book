import type { Lang, Locale, ParagraphKind } from "@/lib/content/types";

export interface RenditionInfo {
  /** Base storage key without extension, e.g. audio/story/te-IN/Aoede/abc123def456 */
  key: string;
  storyId: string;
  locale: Locale;
  lang: Lang;
  voice: string;
  renditionHash: string;
  contentHash: string;
  url: string;
  manifestUrl: string;
  bytes: number;
  durationMs: number;
  mimeType: "audio/mpeg";
  createdAt: string;
}

export interface RenditionManifest extends RenditionInfo {
  pipelineVersion: number;
  speakingRate: number;
  sampleRate: number;
  bitrateKbps: number;
  leadInMs: number;
  sections: { index: number; title?: string; startMs: number }[];
  paragraphs: { index: number; sectionIndex: number; kind: ParagraphKind; startMs: number; endMs: number }[];
  chunks: { index: number; paragraphIndex: number; startMs: number; endMs: number; chars: number }[];
}
