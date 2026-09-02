import type { Lang } from "@/lib/content/types";

/** Rough speech rate at speakingRate 1.0, in characters per second. Tune with `pnpm audio:status --calibrate`. */
export const CHARS_PER_SECOND: Record<Lang, number> = { en: 14, te: 9, ta: 9, kn: 9, ml: 9 };

export function estimateSeconds(chars: number, lang: Lang, speakingRate: number): number {
  const cps = CHARS_PER_SECOND[lang] * speakingRate;
  return chars / cps;
}
