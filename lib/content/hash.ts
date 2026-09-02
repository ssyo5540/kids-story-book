import { createHash } from "node:crypto";
import type { Paragraph } from "./types";

/** Bump only when normalize/chunk/encode changes should invalidate ALL existing audio. */
export const PIPELINE_VERSION = 1;

const SEP_FIELD = "\u0001";
const SEP_RECORD = "\u0002";

function sha12(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 12);
}

/** Hash of the normalized narration (locale independent; frontmatter changes do not affect it). */
export function contentHash(paragraphs: Paragraph[]): string {
  return sha12(paragraphs.map((p) => `${p.kind}${SEP_FIELD}${p.narration}`).join(SEP_RECORD));
}

/** Hash that identifies one audio rendition's input: locale-prepared text + rate + pipeline version. */
export function renditionHash(input: { preparedParagraphs: string[]; speakingRate: number }): string {
  return sha12(`${PIPELINE_VERSION}|${input.speakingRate}|${input.preparedParagraphs.join(SEP_RECORD)}`);
}
