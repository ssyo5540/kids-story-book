"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/Button";
import type { StoryCard } from "@/lib/content/catalog";
import { LOCALE_INFO, LOCALE_LANG, type Locale } from "@/lib/content/types";
import { personaFor, useVoices } from "@/lib/hooks/useVoices";
import { defaultRefFor, usePlayerStore } from "@/lib/store/playerStore";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { VoiceBrowser, type VoiceSelection } from "./VoiceBrowser";

export function VoicePicker({
  open,
  onOpenChange,
  story,
  mode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  story?: StoryCard;
  mode: "switch" | "browse";
}) {
  const now = usePlayerStore((s) => s.now);
  const switchVoice = usePlayerStore((s) => s.switchVoice);
  const load = usePlayerStore((s) => s.load);
  const preferredLocale = useSettingsStore((s) => s.preferredLocale);
  const setPreferredLocale = useSettingsStore((s) => s.setPreferredLocale);
  const setPreferredVoice = useSettingsStore((s) => s.setPreferredVoice);
  const { data: catalog } = useVoices();
  const [sel, setSel] = useState<VoiceSelection | null>(null);
  const [confirm, setConfirm] = useState(false);

  const currentRef =
    story && now?.story.id === story.id
      ? now.info
        ? { locale: now.info.locale, voice: now.info.voice }
        : now.ref
      : story
        ? defaultRefFor(story)
        : { locale: preferredLocale, voice: "default" };
  const initialLocale: Locale =
    story && !story.langs.includes(LOCALE_LANG[currentRef.locale]) ? "en-IN" : currentRef.locale;
  const selected = sel ?? currentRef;
  const persona = sel ? personaFor(catalog, sel.locale, sel.voice) : null;

  const apply = () => {
    if (!sel) return;
    setPreferredLocale(sel.locale);
    setPreferredVoice(sel.locale, sel.voice);
    if (mode === "switch" && story) {
      if (now?.story.id === story.id) void switchVoice(sel.locale, sel.voice);
      else
        void load(
          story,
          { storyId: story.id, locale: sel.locale, voice: sel.voice },
          { autoplay: true, startAt: "resume", expand: true },
        );
    }
    onOpenChange(false);
    setSel(null);
    setConfirm(false);
  };

  const onUse = () => {
    if (!sel) return;
    if (mode === "switch" && sel.availability === "missing") setConfirm(true);
    else apply();
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setSel(null);
          setConfirm(false);
        }
      }}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[92dvh] flex-col rounded-t-sheet border-t border-line bg-bg text-fg outline-none lg:mx-auto lg:max-w-3xl"
        >
          <Drawer.Handle className="mt-3 !w-12 !bg-white/30" />
          <div className="px-5 pt-3 sm:px-7">
            <Drawer.Title className="font-display text-2xl font-extrabold">
              {mode === "switch" ? "Who should read tonight?" : "Meet the narrators"}
            </Drawer.Title>
            <p className="text-sm text-fg-muted">
              Pick a region, then a language, then a voice. Tap Preview to hear a few words.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-7">
            <VoiceBrowser
              story={story}
              initialLocale={initialLocale}
              selected={selected}
              onSelect={(s) => {
                setSel(s);
                setConfirm(false);
              }}
            />
          </div>
          <div className="safe-bottom border-t border-line bg-bg-deep/80 px-5 py-3 sm:px-7">
            {confirm && sel ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Prepare <span className="font-bold">{persona?.displayNameLatin ?? sel.voice}</span>'s{" "}
                  {LOCALE_INFO[sel.locale].label} voice? It takes about twenty seconds the first time.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={apply}>Prepare and play</Button>
                  <Button variant="ghost" onClick={() => setConfirm(false)}>
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-fg-muted">
                  {sel && persona ? (
                    <>
                      <span className="font-bold text-fg">{persona.displayNameLatin}</span> ·{" "}
                      {LOCALE_INFO[sel.locale].label}
                    </>
                  ) : (
                    "Choose a voice"
                  )}
                </p>
                <Button onClick={onUse} disabled={!sel}>
                  {mode === "switch"
                    ? "Use this voice"
                    : sel
                      ? `Make ${persona?.displayNameLatin ?? "this"} my voice`
                      : "Make this my voice"}
                </Button>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
