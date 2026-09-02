"use client";

import { useState } from "react";
import { VoicePicker } from "@/components/voices/VoicePicker";
import type { StoryCard } from "@/lib/content/catalog";
import { LANG_INFO, LOCALE_INFO, LOCALE_LANG, LOCALES, type Locale } from "@/lib/content/types";
import { useReadyVoices } from "@/lib/hooks/useVoices";

function LocaleChip({ story, locale, onClick }: { story: StoryCard; locale: Locale; onClick: () => void }) {
  const ready = useReadyVoices(story.id, locale);
  const info = LOCALE_INFO[locale];
  const n = ready.data?.ready.length;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-sm hover:bg-white/10"
    >
      <span lang={LANG_INFO[info.lang].htmlLang} className="font-display font-bold">
        {info.nativeLabel}
      </span>
      {info.lang === "en" ? <span className="text-xs text-fg-muted">{info.hint}</span> : null}
      <span className="text-xs text-fg-muted">{n === undefined ? "" : n > 0 ? `· ${n} ready` : "· on request"}</span>
    </button>
  );
}

export function NarrationLanguages({ story }: { story: StoryCard }) {
  const [open, setOpen] = useState(false);
  const locales = LOCALES.filter((l) => story.langs.includes(LOCALE_LANG[l]));
  return (
    <div className="space-y-1">
      <p className="font-display text-xs font-bold uppercase tracking-wide text-fg-muted">Listen in</p>
      <ul className="flex flex-wrap justify-center gap-2 sm:justify-start">
        {locales.map((l) => (
          <li key={l}>
            <LocaleChip story={story} locale={l} onClick={() => setOpen(true)} />
          </li>
        ))}
      </ul>
      <VoicePicker open={open} onOpenChange={setOpen} story={story} mode="switch" />
    </div>
  );
}
