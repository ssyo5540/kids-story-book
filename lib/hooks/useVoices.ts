"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReadyVoices } from "@/lib/api-client/renditions";
import type { Locale } from "@/lib/content/types";
import type { PublicVoice, PublicVoicesCatalog } from "@/lib/tts/voices";

export function useVoices() {
  return useQuery<PublicVoicesCatalog>({
    queryKey: ["voices"],
    queryFn: async () => {
      const res = await fetch("/api/voices");
      if (!res.ok) throw new Error("voices unavailable");
      return res.json();
    },
    staleTime: 10 * 60_000,
  });
}

export function useReadyVoices(storyId: string | undefined, locale: Locale | undefined, enabled = true) {
  return useQuery({
    queryKey: ["ready", storyId, locale],
    queryFn: () => fetchReadyVoices(storyId as string, locale as Locale),
    enabled: enabled && !!storyId && !!locale,
    staleTime: 30_000,
    refetchInterval: (q) => (q.state.data ? 60_000 : false),
  });
}

export function personaFor(
  catalog: PublicVoicesCatalog | undefined,
  locale: Locale,
  voice: string,
): PublicVoice | undefined {
  return catalog?.locales[locale]?.voices.find((v) => v.name === voice || (voice === "default" && v.isDefault));
}
