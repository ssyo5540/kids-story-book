"use client";

import { Check, CloudDownload, Loader2, Pause, Play, Star } from "lucide-react";
import type { PublicVoice } from "@/lib/tts/voices";
import { cn } from "@/lib/utils/cn";
import { VoiceAvatar } from "./VoiceAvatar";

export type Availability = "ready" | "missing" | "generating" | "unknown";

export function VoiceCard({
  voice,
  selected,
  isYours,
  availability,
  previewing,
  onSelect,
  onPreview,
}: {
  voice: PublicVoice;
  selected: boolean;
  isYours: boolean;
  availability?: Availability;
  previewing: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const grand = /grand|nana|amma|thatha|ajj|paatti|appoop|ammoom/i.test(voice.displayNameLatin);
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-card border p-3 text-center transition",
        selected ? "border-accent bg-accent/10 shadow-glow" : "border-line bg-white/5 hover:bg-white/10",
      )}
    >
      {voice.isDefault ? (
        <span
          className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-pill bg-night-950/70 px-1.5 py-0.5 text-[0.6rem] font-bold text-star"
          title="Default voice"
        >
          <Star className="h-3 w-3 fill-current" aria-hidden="true" /> Default
        </span>
      ) : null}
      {isYours ? (
        <span className="absolute right-2 top-2 rounded-pill bg-leaf-500/90 px-1.5 py-0.5 text-[0.6rem] font-bold text-night-950">
          Yours
        </span>
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex flex-col items-center gap-1.5 pt-3 focus-visible:outline-none"
        aria-label={`Choose ${voice.displayNameLatin}, ${voice.gender} voice`}
      >
        <VoiceAvatar seed={`${voice.id}`} gender={voice.gender} grand={grand} className="h-[4.5rem] w-[4.5rem]" />
        <span className="font-display text-base font-extrabold leading-tight">
          {voice.displayName}
          {voice.displayName !== voice.displayNameLatin ? (
            <span className="block text-xs font-bold text-fg-muted">{voice.displayNameLatin}</span>
          ) : null}
        </span>
        <span className="text-xs text-fg-muted">{voice.blurb}</span>
        <span
          className={cn(
            "rounded-pill px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide",
            voice.gender === "female" ? "bg-berry-500/20 text-berry-500" : "bg-sky-400/20 text-sky-400",
          )}
        >
          {voice.gender}
        </span>
      </button>
      <div className="flex w-full items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPreview}
          aria-label={previewing ? `Stop preview of ${voice.displayNameLatin}` : `Preview ${voice.displayNameLatin}`}
          aria-pressed={previewing}
          className="inline-flex h-9 items-center gap-1 rounded-pill border border-line px-3 font-display text-xs font-bold hover:bg-white/10"
        >
          {previewing ? (
            <Pause className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
          )}
          {previewing ? "Stop" : "Preview"}
        </button>
        {availability ? <AvailabilityPill a={availability} /> : null}
        {selected ? <Check className="h-5 w-5 text-accent" aria-label="Selected" /> : null}
      </div>
    </div>
  );
}

function AvailabilityPill({ a }: { a: Availability }) {
  if (a === "ready")
    return (
      <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-leaf-500">
        <span className="h-1.5 w-1.5 rounded-full bg-leaf-500" aria-hidden="true" /> Ready
      </span>
    );
  if (a === "generating")
    return (
      <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-accent">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Preparing
      </span>
    );
  if (a === "missing")
    return (
      <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-fg-muted">
        <CloudDownload className="h-3 w-3" aria-hidden="true" /> ~20 s to prepare
      </span>
    );
  return null;
}
