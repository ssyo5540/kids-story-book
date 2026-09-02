"use client";

import { toast } from "sonner";
import { LOCALE_INFO } from "@/lib/content/types";
import { personaFor, useVoices } from "@/lib/hooks/useVoices";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { VoiceBrowser } from "./VoiceBrowser";

export function VoicesPage() {
  const preferredLocale = useSettingsStore((s) => s.preferredLocale);
  const preferredByLocale = useSettingsStore((s) => s.preferredVoiceByLocale);
  const setPreferredLocale = useSettingsStore((s) => s.setPreferredLocale);
  const setPreferredVoice = useSettingsStore((s) => s.setPreferredVoice);
  const { data: catalog } = useVoices();
  const selected = { locale: preferredLocale, voice: preferredByLocale[preferredLocale] ?? "default" };
  return (
    <VoiceBrowser
      initialLocale={preferredLocale}
      selected={selected}
      onSelect={(s) => {
        setPreferredLocale(s.locale);
        setPreferredVoice(s.locale, s.voice);
        const p = personaFor(catalog, s.locale, s.voice);
        toast(`${p?.displayNameLatin ?? s.voice} will read your ${LOCALE_INFO[s.locale].label} stories.`);
      }}
    />
  );
}
