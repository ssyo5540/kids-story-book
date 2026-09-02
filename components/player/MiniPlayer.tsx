"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { CoverArt } from "@/components/catalog/CoverArt";
import { personaFor, useVoices } from "@/lib/hooks/useVoices";
import { usePlayerStore } from "@/lib/store/playerStore";
import { cn } from "@/lib/utils/cn";
import { PlayerControls } from "./PlayerControls";
import { ProgressRing } from "./PreparingState";

export function MiniPlayer() {
  const now = usePlayerStore((s) => s.now);
  const status = usePlayerStore((s) => s.status);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const preparing = usePlayerStore((s) => s.preparing);
  const setExpanded = usePlayerStore((s) => s.setExpanded);
  const stop = usePlayerStore((s) => s.stop);
  const { data: voices } = useVoices();

  const visible = !!now;
  useEffect(() => {
    document.documentElement.style.setProperty("--dock-h", visible ? "4.75rem" : "0px");
    return () => document.documentElement.style.setProperty("--dock-h", "0px");
  }, [visible]);

  if (!now) return null;
  const ref = now.info ? { locale: now.info.locale, voice: now.info.voice } : now.ref;
  const persona = personaFor(voices, ref.locale, ref.voice);
  const pct = duration ? (position / duration) * 100 : 0;
  const busy = status === "preparing" || status === "loading";

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 lg:left-60",
        "bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))] lg:bottom-0",
      )}
    >
      <div className="mx-auto max-w-7xl px-2 pb-1 sm:px-4 lg:px-0 lg:pb-0">
        <div className="relative flex items-center gap-3 overflow-hidden rounded-card border border-line bg-night-800/95 p-2 pr-3 shadow-lift backdrop-blur-md lg:rounded-none lg:border-x-0 lg:border-b-0">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-white/10" aria-hidden="true">
            <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={`Open player: ${now.story.title.en}`}
          >
            <div className="relative h-14 w-[2.65rem] shrink-0 overflow-hidden rounded-r-md rounded-l-sm shadow-cover">
              <CoverArt symbol={now.story.cover.symbol} accent={now.story.cover.accent} />
              {busy ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-accent">
                  <ProgressRing percent={preparing?.job?.percent ?? 3} className="h-8 w-8" />
                </div>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-extrabold leading-tight">{now.story.title.en}</p>
              <p className="truncate text-xs text-fg-muted">
                {busy
                  ? `Preparing ${persona?.displayNameLatin ?? ref.voice}…`
                  : status === "error"
                    ? "Could not play — tap for options"
                    : `${persona?.displayNameLatin ?? ref.voice} · ${now.story.collectionTitle.en}`}
              </p>
            </div>
          </button>
          <PlayerControls size="sm" />
          <button
            type="button"
            onClick={stop}
            aria-label="Close player"
            className="inline-flex h-9 w-9 items-center justify-center rounded-pill text-fg-muted hover:bg-white/10 hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
