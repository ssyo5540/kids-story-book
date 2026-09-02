import { getConfig } from "@/lib/config";
import type { VoicesFile } from "@/lib/content/schema";
import type { Locale, Story } from "@/lib/content/types";
import { prepareNarration } from "@/lib/narration/prepare";
import { loadPronunciations, tableForLocale } from "@/lib/narration/pronounce";
import type { NarrationPlan } from "@/lib/narration/types";

/** Build the narration plan for one story/locale/voice using the current config, voices and pronunciations. */
export async function buildPlan(
  story: Story,
  collectionTitle: string,
  locale: Locale,
  voiceName: string,
  voices: VoicesFile,
): Promise<NarrationPlan> {
  const cfg = getConfig();
  const pron = tableForLocale(await loadPronunciations(cfg.CONTENT_DIR), locale);
  const speakingRate = voices.locales[locale].speakingRate ?? cfg.TTS_SPEAKING_RATE;
  return prepareNarration(story, locale, voiceName, {
    speakingRate,
    maxChunkBytes: cfg.TTS_MAX_CHUNK_BYTES,
    maxChunkEstSeconds: cfg.TTS_MAX_CHUNK_EST_SECONDS,
    pronunciations: pron,
    useIpa: cfg.customPronunciationLocales.includes(locale),
    collectionTitle,
  });
}
