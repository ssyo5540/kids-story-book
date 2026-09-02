"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import type { StoryCard } from "@/lib/content/catalog";
import { LANG_INFO, LOCALE_LANG, type Locale, type RegionId } from "@/lib/content/types";
import { useReadyVoices, useVoices } from "@/lib/hooks/useVoices";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { cn } from "@/lib/utils/cn";
import { usePreview } from "./usePreview";
import { type Availability, VoiceCard } from "./VoiceCard";

export interface VoiceSelection {
  locale: Locale;
  voice: string;
  availability: Availability | undefined;
}

export function VoiceBrowser({
  story,
  initialLocale,
  selected,
  onSelect,
}: {
  /** When given, only languages this story has text for are shown and readiness pills appear. */
  story?: StoryCard;
  initialLocale: Locale;
  selected: { locale: Locale; voice: string } | null;
  onSelect: (sel: VoiceSelection) => void;
}) {
  const { data: catalog, isLoading, isError } = useVoices();
  const preferredByLocale = useSettingsStore((s) => s.preferredVoiceByLocale);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [region, setRegion] = useState<RegionId>(
    () => catalog?.regions.find((r) => r.locales.includes(initialLocale))?.id ?? "asia",
  );
  const { playingId, toggle } = usePreview();
  const ready = useReadyVoices(story?.id, locale, !!story);

  const regions = useMemo(() => {
    if (!catalog) return [];
    return catalog.regions
      .map((r) => ({ ...r, locales: r.locales.filter((l) => !story || story.langs.includes(LOCALE_LANG[l])) }))
      .filter((r) => r.locales.length > 0);
  }, [catalog, story]);

  useEffect(() => {
    if (!regions.length) return;
    const r = regions.find((x) => x.locales.includes(locale)) ?? regions[0];
    setRegion((cur) => (regions.some((x) => x.id === cur) ? cur : r.id));
    if (!r.locales.includes(locale)) setLocale(r.locales[0]);
  }, [regions, locale]);

  if (isLoading) return <div className="h-40 animate-pulse rounded-card bg-white/5" aria-hidden="true" />;
  if (isError || !catalog) return <p className="text-sm text-fg-muted">Voices are unavailable right now.</p>;

  const current = catalog.locales[locale];
  const localesInRegion = regions.find((r) => r.id === region)?.locales ?? [];

  return (
    <div className="space-y-4">
      <Tabs.Root
        value={region}
        onValueChange={(v) => {
          const r = regions.find((x) => x.id === v);
          if (!r) return;
          setRegion(r.id);
          if (!r.locales.includes(locale)) setLocale(r.locales[0]);
        }}
      >
        <Tabs.List aria-label="Region" className="flex gap-1 rounded-pill border border-line bg-white/5 p-1">
          {regions.map((r) => (
            <Tabs.Trigger
              key={r.id}
              value={r.id}
              className="flex-1 rounded-pill px-3 py-2 font-display text-sm font-bold text-fg-muted transition data-[state=active]:bg-accent data-[state=active]:text-accent-ink"
            >
              {r.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {regions.map((r) => (
          <Tabs.Content key={r.id} value={r.id} className="sr-only">
            {r.label} voices
          </Tabs.Content>
        ))}
      </Tabs.Root>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Language">
        {localesInRegion.map((l) => {
          const info = catalog.locales[l];
          return (
            <Chip key={l} role="radio" aria-checked={l === locale} selected={l === locale} onClick={() => setLocale(l)}>
              <span lang={LANG_INFO[LOCALE_LANG[l]].htmlLang}>{info.nativeLabel}</span>
              {info.lang === "en" ? <span className="text-xs opacity-80">· {info.hint}</span> : null}
            </Chip>
          );
        })}
      </div>

      {current.audioQuality === "beta" ? (
        <p className="text-xs text-fg-muted">
          Voices in this language are still being tuned. English (Indian accent) is a good alternative.
        </p>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {current.voices.map((v) => {
          let availability: Availability | undefined;
          if (story) {
            if (ready.isLoading || ready.isError) availability = "unknown";
            else availability = ready.data?.ready.includes(v.name) ? "ready" : "missing";
          }
          const isSelected =
            selected?.locale === locale && (selected.voice === v.name || (selected.voice === "default" && v.isDefault));
          return (
            <li key={v.id}>
              <VoiceCard
                voice={v}
                selected={!!isSelected}
                isYours={preferredByLocale[locale] === v.name}
                availability={availability}
                previewing={playingId === v.id}
                onPreview={() => void toggle(v.id, v.previewUrl)}
                onSelect={() => onSelect({ locale, voice: v.name, availability })}
              />
            </li>
          );
        })}
      </ul>
      <p className={cn("text-xs text-fg-muted")}>
        Every language offers four female and four male narrators. Previews are short and free to play.
      </p>
    </div>
  );
}
