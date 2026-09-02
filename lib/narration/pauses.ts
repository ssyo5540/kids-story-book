import type { ParagraphKind } from "@/lib/content/types";

/** All pauses are inserted as digital silence at encode time (never as TTS markup). */
export const PAUSE_MS = {
  intraParagraph: 150,
  text: 700,
  dialogue: 450,
  heading: 900,
  beforeHeading: 1500,
  break: 2500,
  leadIn: 300,
  tail: 1200,
} as const;

export function pauseAfterParagraph(kind: ParagraphKind, nextKind: ParagraphKind | undefined): number {
  let ms: number = kind === "dialogue" ? PAUSE_MS.dialogue : kind === "heading" ? PAUSE_MS.heading : PAUSE_MS.text;
  if (nextKind === "heading") ms = Math.max(ms, PAUSE_MS.beforeHeading);
  return ms;
}
