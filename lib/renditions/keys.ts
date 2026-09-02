import type { Locale } from "@/lib/content/types";

export function renditionBaseKey(storyId: string, locale: Locale, voice: string, renditionHash: string): string {
  return `audio/${storyId}/${locale}/${voice}/${renditionHash}`;
}

export function previewKey(locale: Locale, voice: string): string {
  return `previews/${locale}/${voice}.mp3`;
}

const KEY_RE = /^audio\/([a-z0-9-]+)\/([a-zA-Z-]+)\/([A-Za-z]+)\/([0-9a-f]{12})\.json$/;

export function parseManifestKey(
  key: string,
): { storyId: string; locale: string; voice: string; renditionHash: string } | null {
  const m = KEY_RE.exec(key);
  return m ? { storyId: m[1], locale: m[2], voice: m[3], renditionHash: m[4] } : null;
}

/** URL-safe job id: story~locale~voice~hash */
export function jobIdFor(storyId: string, locale: Locale, voice: string, renditionHash: string): string {
  return `${storyId}~${locale}~${voice}~${renditionHash}`;
}

export const JOB_ID_RE = /^[a-z0-9-]+~[a-zA-Z-]+~[A-Za-z]+~[0-9a-f]{12}$/;
