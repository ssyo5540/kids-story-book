"use client";

import { create } from "zustand";
import {
  type RenditionRef,
  RenditionUnavailableError,
  resolveKnown,
  resolveRendition,
} from "@/lib/api-client/renditions";
import type { RenditionInfo, RenditionManifest } from "@/lib/audio/manifest";
import type { StoryCard } from "@/lib/content/catalog";
import { LOCALE_LANG, type Locale } from "@/lib/content/types";
import type { JobProgress } from "@/lib/jobs/progress";
import { ambienceSrc } from "@/lib/player/ambience";
import { engine } from "@/lib/player/engine";
import { setNowPlaying, setPlaybackState } from "@/lib/player/mediaSession";
import { mapPosition } from "@/lib/player/positionMap";
import { endOfStoryEndsAt, fadeGain } from "@/lib/player/sleepTimer";
import { resolveFromDownload } from "@/lib/pwa/downloads";
import { coverPngUrl } from "@/lib/utils/covers";
import { useLibraryStore } from "./libraryStore";
import {
  type AmbienceLevel,
  type AmbienceTrack,
  type PlaybackRate,
  type SleepMinutes,
  type SleepMode,
  useSettingsStore,
} from "./settingsStore";

export type PlayerStatus = "idle" | "preparing" | "loading" | "buffering" | "playing" | "paused" | "ended" | "error";

export interface NowPlaying {
  story: StoryCard;
  ref: RenditionRef;
  info: RenditionInfo | null;
  manifest: RenditionManifest | null;
  fromDownload: boolean;
}

export interface PreparingInfo {
  target: RenditionRef;
  job: JobProgress | null;
  fallback?: RenditionInfo;
  startedAt: number;
}

export interface PlayerError {
  code:
    | "budget"
    | "disabled"
    | "failed"
    | "unpublished"
    | "network"
    | "decode"
    | "unsupported"
    | "aborted"
    | "autoplay";
  message: string;
  fallback?: RenditionInfo;
  retryAfter?: string;
}

export interface SleepState {
  mode: SleepMode;
  minutes: SleepMinutes;
  endsAt: number | null;
  fading: boolean;
}

export interface LoadOptions {
  autoplay?: boolean;
  /** number = seconds; "resume" = saved position; function = computed from the new manifest */
  startAt?: number | "resume" | ((manifest: RenditionManifest) => number);
  expand?: boolean;
}

export interface PlayerState {
  now: NowPlaying | null;
  status: PlayerStatus;
  intent: "play" | "pause";
  position: number;
  duration: number;
  buffered: number;
  rate: PlaybackRate;
  expanded: boolean;
  preparing: PreparingInfo | null;
  error: PlayerError | null;
  sleep: SleepState;
  ambience: { track: AmbienceTrack; level: AmbienceLevel };

  load(story: StoryCard, ref: RenditionRef, opts?: LoadOptions): Promise<void>;
  loadKnown(story: StoryCard, info: RenditionInfo, opts?: LoadOptions): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  toggle(): void;
  seek(sec: number): void;
  skip(deltaSec: number): void;
  setRate(rate: PlaybackRate): void;
  switchVoice(locale: Locale, voice: string): Promise<void>;
  playDefaultInstead(): Promise<void>;
  cancelPreparing(): void;
  setSleepTimer(mode: SleepMode, minutes?: SleepMinutes): void;
  setAmbience(track: AmbienceTrack, level?: AmbienceLevel): void;
  setExpanded(v: boolean): void;
  stop(): void;

  /** engine → store */
  _sync(p: Partial<Pick<PlayerState, "position" | "duration" | "buffered">>): void;
  _status(status: "playing" | "paused" | "buffering" | "ended"): void;
  _error(e: PlayerError): void;
  _tick(nowMs: number): void;
}

let abort: AbortController | null = null;
let lastSave = 0;

/** Pick the narration locale/voice for a story from the family's preferences, falling back to English (India). */
export function defaultRefFor(story: StoryCard): RenditionRef {
  const settings = useSettingsStore.getState();
  const preferred = settings.preferredLocale;
  const locale: Locale = story.langs.includes(LOCALE_LANG[preferred]) ? preferred : "en-IN";
  return { storyId: story.id, locale, voice: settings.preferredVoiceByLocale[locale] ?? "default" };
}

export const usePlayerStore = create<PlayerState>()((set, get) => {
  const applyMeta = (story: StoryCard, ref: RenditionRef) => {
    setNowPlaying({
      title: story.title[LOCALE_LANG[ref.locale]] ?? story.title.en,
      artist: story.collectionTitle.en,
      album: "Nightlight Tales",
      artworkUrl: coverPngUrl(story.cover),
    });
  };

  const finishLoad = async (
    story: StoryCard,
    resolved: { info: RenditionInfo; manifest: RenditionManifest; fromDownload: boolean },
    opts: LoadOptions,
    signal: AbortSignal,
  ) => {
    const { info, manifest, fromDownload } = resolved;
    let startAt = 0;
    if (typeof opts.startAt === "number") startAt = opts.startAt;
    else if (typeof opts.startAt === "function") startAt = opts.startAt(manifest);
    else if (opts.startAt === "resume") {
      const saved = useLibraryStore.getState().positions[story.id];
      if (saved && !saved.completed && saved.position > 5 && saved.position < info.durationMs / 1000 - 10)
        startAt = saved.position;
    }
    set({ status: "loading" });
    await engine.setSource(info.url, startAt);
    if (signal.aborted) return;
    engine.setRate(get().rate);
    set({
      now: { story, ref: { storyId: story.id, locale: info.locale, voice: info.voice }, info, manifest, fromDownload },
      status: "paused",
      preparing: null,
      error: null,
      position: startAt,
      duration: info.durationMs / 1000,
      buffered: 0,
    });
    applyMeta(story, { storyId: story.id, locale: info.locale, voice: info.voice });
    useLibraryStore.getState().touchRecent({ storyId: story.id, locale: info.locale, voice: info.voice });
    const settings = useSettingsStore.getState();
    settings.setPreferredLocale(info.locale);
    settings.setPreferredVoice(info.locale, info.voice);
    if (get().intent === "play") await get().play();
    return startAt;
  };

  const handleLoadError = (e: unknown) => {
    if ((e as Error)?.name === "AbortError") return;
    if (e instanceof RenditionUnavailableError) {
      const code = e.reason === "unknown_story" || e.reason === "unknown_voice" ? "failed" : e.reason;
      set({
        status: "error",
        preparing: null,
        error: { code, message: e.message, fallback: e.fallback, retryAfter: e.retryAfter },
      });
      return;
    }
    set({
      status: "error",
      preparing: null,
      error: {
        code: "failed",
        message: (e as Error)?.message ?? "Something went wrong.",
        fallback: get().preparing?.fallback,
      },
    });
  };

  return {
    now: null,
    status: "idle",
    intent: "pause",
    position: 0,
    duration: 0,
    buffered: 0,
    rate: 1,
    expanded: false,
    preparing: null,
    error: null,
    sleep: { mode: "off", minutes: 30, endsAt: null, fading: false },
    ambience: { track: "none", level: 1 },

    async load(story, ref, opts = {}) {
      abort?.abort();
      const ctrl = new AbortController();
      abort = ctrl;
      engine.unlock();
      const settings = useSettingsStore.getState();
      const rate = get().now ? get().rate : settings.defaultRate;
      set({
        now: { story, ref, info: null, manifest: null, fromDownload: false },
        status: "preparing",
        intent: opts.autoplay ? "play" : "pause",
        preparing: { target: ref, job: null, startedAt: Date.now() },
        error: null,
        rate,
        expanded: opts.expand ?? get().expanded,
        position: 0,
        duration: 0,
        buffered: 0,
      });
      if (!get().now || get().ambience.track === "none")
        get().setAmbience(settings.defaultAmbience.track, settings.defaultAmbience.level);
      if (get().sleep.mode === "off" && settings.defaultSleep.mode !== "off")
        get().setSleepTimer(settings.defaultSleep.mode, settings.defaultSleep.minutes);
      try {
        const resolved = await resolveRendition(ref, {
          signal: ctrl.signal,
          lookupDownload: resolveFromDownload,
          onProgress: (job, fallback) => {
            if (ctrl.signal.aborted) return;
            set({ preparing: { target: ref, job, fallback, startedAt: get().preparing?.startedAt ?? Date.now() } });
          },
        });
        if (ctrl.signal.aborted) return;
        await finishLoad(story, resolved, opts, ctrl.signal);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        handleLoadError(e);
      }
    },

    async loadKnown(story, info, opts = {}) {
      abort?.abort();
      const ctrl = new AbortController();
      abort = ctrl;
      engine.unlock();
      const ref = { storyId: story.id, locale: info.locale, voice: info.voice };
      set({
        now: { story, ref, info: null, manifest: null, fromDownload: false },
        status: "preparing",
        intent: opts.autoplay ? "play" : get().intent,
        preparing: null,
        error: null,
        expanded: opts.expand ?? get().expanded,
      });
      try {
        const resolved = await resolveKnown(info, ctrl.signal);
        if (ctrl.signal.aborted) return;
        await finishLoad(story, resolved, opts, ctrl.signal);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        handleLoadError(e);
      }
    },

    async play() {
      set({ intent: "play" });
      if (!engine.hasSource) return;
      try {
        await engine.play();
        setPlaybackState("playing");
      } catch (e) {
        if ((e as Error)?.name === "NotAllowedError")
          set({ status: "paused", error: { code: "autoplay", message: "Tap play to start the story." } });
        else set({ status: "error", error: { code: "failed", message: (e as Error)?.message ?? "Could not play." } });
      }
    },

    pause() {
      set({ intent: "pause" });
      engine.pause();
      setPlaybackState("paused");
      persistPosition(get(), true);
    },

    toggle() {
      const s = get();
      if (s.status === "playing" || s.status === "buffering") s.pause();
      else void s.play();
    },

    seek(sec) {
      engine.seek(sec);
      set({ position: Math.max(0, Math.min(sec, get().duration || sec)) });
      persistPosition(get(), true);
    },

    skip(delta) {
      get().seek(get().position + delta);
    },

    setRate(rate) {
      engine.setRate(rate);
      set({ rate });
      useSettingsStore.getState().setDefaultRate(rate);
      const s = get();
      if (s.sleep.mode === "end")
        set({ sleep: { ...s.sleep, endsAt: endOfStoryEndsAt(Date.now(), s.position, s.duration, rate) } });
    },

    async switchVoice(locale, voice) {
      const s = get();
      if (!s.now) return;
      const fromManifest = s.now.manifest;
      const fromPos = s.position;
      const fromDur = s.duration;
      const wasPlaying = s.status === "playing" || s.status === "buffering" || s.intent === "play";
      const story = s.now.story;
      await s.load(
        story,
        { storyId: story.id, locale, voice },
        {
          autoplay: wasPlaying,
          startAt: (manifest) => mapPosition(fromManifest, manifest, fromPos, fromDur),
          expand: s.expanded,
        },
      );
    },

    async playDefaultInstead() {
      const s = get();
      const info = s.preparing?.fallback ?? s.error?.fallback;
      if (!s.now || !info) return;
      abort?.abort();
      await s.loadKnown(s.now.story, info, { autoplay: true, startAt: "resume", expand: s.expanded });
    },

    cancelPreparing() {
      abort?.abort();
      const s = get();
      if (s.status === "preparing")
        set({ status: engine.hasSource ? "paused" : "idle", preparing: null, now: engine.hasSource ? s.now : null });
    },

    setSleepTimer(mode, minutes) {
      const s = get();
      const m = minutes ?? s.sleep.minutes;
      let endsAt: number | null = null;
      if (mode === "minutes") endsAt = Date.now() + m * 60_000;
      if (mode === "end") endsAt = endOfStoryEndsAt(Date.now(), s.position, s.duration, s.rate);
      engine.setGain(1);
      set({ sleep: { mode, minutes: m, endsAt, fading: false } });
    },

    setAmbience(track, level) {
      const lv = level ?? get().ambience.level ?? 1;
      engine.ambience.set(ambienceSrc(track, lv));
      set({ ambience: { track, level: lv } });
      useSettingsStore.getState().setDefaultAmbience(track, lv);
    },

    setExpanded(expanded) {
      set({ expanded });
    },

    stop() {
      abort?.abort();
      persistPosition(get(), true);
      engine.pause();
      engine.ambience.set(null);
      setPlaybackState("none");
      set({
        now: null,
        status: "idle",
        intent: "pause",
        position: 0,
        duration: 0,
        buffered: 0,
        expanded: false,
        preparing: null,
        error: null,
        sleep: { ...get().sleep, mode: "off", endsAt: null, fading: false },
      });
    },

    _sync(p) {
      set(p);
      persistPosition({ ...get(), ...p }, false);
    },

    _status(status) {
      const s = get();
      if (s.status === "preparing" || s.status === "loading") {
        if (status === "playing") set({ status });
        return;
      }
      if (status === "ended") {
        const storyId = s.now?.story.id;
        if (storyId) useLibraryStore.getState().markCompleted(storyId);
        engine.ambience.pause();
        setPlaybackState("paused");
        set({
          status: "ended",
          intent: "pause",
          sleep: s.sleep.mode === "end" ? { ...s.sleep, mode: "off", endsAt: null, fading: false } : s.sleep,
        });
        return;
      }
      set({ status, error: status === "playing" ? null : s.error });
      setPlaybackState(status === "playing" ? "playing" : "paused");
    },

    _error(error) {
      set({ status: "error", error });
    },

    _tick(nowMs) {
      const s = get();
      if (s.sleep.mode === "off" || !s.sleep.endsAt) return;
      if (s.sleep.mode === "end") {
        const endsAt = endOfStoryEndsAt(nowMs, s.position, s.duration, s.rate);
        if (Math.abs(endsAt - s.sleep.endsAt) > 2000) set({ sleep: { ...s.sleep, endsAt } });
        return; // the natural "ended" event handles stopping
      }
      const g = fadeGain(nowMs, s.sleep.endsAt);
      engine.setGain(g);
      if (g < 1 && !s.sleep.fading) set({ sleep: { ...s.sleep, fading: true } });
      if (g <= 0) {
        s.pause();
        engine.setGain(1);
        set({ sleep: { ...s.sleep, mode: "off", endsAt: null, fading: false } });
      }
    },
  };
});

function persistPosition(s: PlayerState, force: boolean) {
  if (!s.now?.info) return;
  const now = Date.now();
  if (!force && now - lastSave < 5000) return;
  lastSave = now;
  useLibraryStore.getState().savePosition(s.now.story.id, {
    position: s.position,
    duration: s.duration,
    locale: s.now.info.locale,
    voice: s.now.info.voice,
  });
}
