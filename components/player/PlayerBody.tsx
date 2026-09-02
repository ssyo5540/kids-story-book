"use client";

import { ChevronDown, Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CoverArt } from "@/components/catalog/CoverArt";
import { VoicePicker } from "@/components/voices/VoicePicker";
import { LANG_INFO, LOCALE_INFO, LOCALE_LANG } from "@/lib/content/types";
import { personaFor, useVoices } from "@/lib/hooks/useVoices";
import { useLibraryStore } from "@/lib/store/libraryStore";
import { usePlayerStore } from "@/lib/store/playerStore";
import { cn } from "@/lib/utils/cn";
import { PlayerControls } from "./PlayerControls";
import { PlayerMenus } from "./PlayerMenus";
import { PreparingState } from "./PreparingState";
import { SeekBar } from "./SeekBar";

export function PlayerBody({ onCollapse }: { onCollapse: () => void }) {
  const now = usePlayerStore((s) => s.now);
  const status = usePlayerStore((s) => s.status);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const buffered = usePlayerStore((s) => s.buffered);
  const seek = usePlayerStore((s) => s.seek);
  const sleep = usePlayerStore((s) => s.sleep);
  const { data: voices } = useVoices();
  const favourites = useLibraryStore((s) => s.favourites);
  const toggleFavourite = useLibraryStore((s) => s.toggleFavourite);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!now) return null;
  const ref = now.info ? { locale: now.info.locale, voice: now.info.voice } : now.ref;
  const persona = personaFor(voices, ref.locale, ref.voice);
  const personaName = persona?.displayNameLatin ?? persona?.displayName ?? ref.voice;
  const lang = LOCALE_LANG[ref.locale];
  const localeInfo = LOCALE_INFO[ref.locale];
  const nativeTitle = now.story.title[lang];
  const busy = status === "preparing" || status === "loading" || status === "error";
  const fav = favourites.includes(now.story.id);

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Minimise player"
          className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-fg-muted hover:bg-white/10 hover:text-fg"
        >
          <ChevronDown className="h-6 w-6" aria-hidden="true" />
        </button>
        <Link
          href={`/collections/${now.story.collection}`}
          className="truncate font-display text-sm font-bold uppercase tracking-wide text-fg-muted hover:text-fg"
          onClick={onCollapse}
        >
          {now.story.collectionTitle.en}
        </Link>
        <button
          type="button"
          onClick={() => toggleFavourite(now.story.id)}
          aria-pressed={fav}
          aria-label={fav ? "Remove from favourites" : "Add to favourites"}
          className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-fg-muted hover:bg-white/10 hover:text-fg"
        >
          <Heart className={cn("h-6 w-6", fav && "fill-berry-500 text-berry-500")} aria-hidden="true" />
        </button>
      </div>

      <div className="mx-auto w-44 sm:w-52">
        <div
          className={cn(
            "relative aspect-[3/4] overflow-hidden rounded-r-card rounded-l-md shadow-cover transition",
            status === "playing" && "shadow-[0_0_60px_-10px_rgba(246,183,60,0.45)]",
          )}
        >
          <div
            className="absolute inset-y-0 left-0 z-10 w-2.5 bg-gradient-to-r from-black/60 via-black/25 to-transparent"
            aria-hidden="true"
          />
          <CoverArt symbol={now.story.cover.symbol} accent={now.story.cover.accent} />
        </div>
      </div>

      <div className="text-center">
        <h2 className="font-display text-2xl font-extrabold leading-tight text-balance">
          <Link href={`/stories/${now.story.id}`} onClick={onCollapse} className="hover:text-accent">
            {now.story.title.en}
          </Link>
        </h2>
        {nativeTitle && nativeTitle !== now.story.title.en ? (
          <p lang={LANG_INFO[lang].htmlLang} className="font-display text-lg text-fg-muted">
            {nativeTitle}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-fg-muted">
          Read by <span className="font-bold text-fg">{personaName}</span> · {localeInfo.label}
          {localeInfo.lang === "en" ? ` (${localeInfo.hint})` : ""}
          {now.fromDownload ? " · offline" : ""}
        </p>
        {sleep.fading ? <p className="mt-1 text-xs text-accent">Fading out…</p> : null}
      </div>

      {busy ? <PreparingState personaName={personaName} /> : null}

      <div className={cn(busy && "opacity-50")}>
        <SeekBar position={position} duration={duration} buffered={buffered} onSeek={seek} disabled={busy} />
      </div>
      <PlayerControls size="lg" />
      <PlayerMenus onOpenVoices={() => setPickerOpen(true)} voiceLabel={personaName} />

      <VoicePicker open={pickerOpen} onOpenChange={setPickerOpen} story={now.story} mode="switch" />
    </div>
  );
}
