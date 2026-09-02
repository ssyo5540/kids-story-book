"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_LOCALE, type Locale } from "@/lib/content/types";

export type SleepMode = "off" | "minutes" | "end";
export type SleepMinutes = 10 | 20 | 30 | 45 | 60;
export type AmbienceTrack = "none" | "rain" | "crickets" | "lullaby";
export type AmbienceLevel = 0 | 1 | 2 | 3;
export type PlaybackRate = 0.8 | 0.9 | 1 | 1.1 | 1.25;

export interface SettingsState {
  preferredLocale: Locale;
  preferredVoiceByLocale: Partial<Record<Locale, string>>;
  dim: boolean;
  defaultSleep: { mode: SleepMode; minutes: SleepMinutes };
  defaultAmbience: { track: AmbienceTrack; level: AmbienceLevel };
  defaultRate: PlaybackRate;
  continueToNext: boolean;
  parentGateEnabled: boolean;
  installBannerDismissedAt: number | null;
  hasHydrated: boolean;

  setPreferredLocale(locale: Locale): void;
  setPreferredVoice(locale: Locale, voice: string): void;
  setDim(dim: boolean): void;
  toggleDim(): void;
  setDefaultSleep(mode: SleepMode, minutes?: SleepMinutes): void;
  setDefaultAmbience(track: AmbienceTrack, level?: AmbienceLevel): void;
  setDefaultRate(rate: PlaybackRate): void;
  setContinueToNext(v: boolean): void;
  setParentGateEnabled(v: boolean): void;
  dismissInstallBanner(): void;
  _setHasHydrated(v: boolean): void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      preferredLocale: DEFAULT_LOCALE,
      preferredVoiceByLocale: {},
      dim: false,
      defaultSleep: { mode: "off", minutes: 30 },
      defaultAmbience: { track: "none", level: 1 },
      defaultRate: 1,
      continueToNext: false,
      parentGateEnabled: true,
      installBannerDismissedAt: null,
      hasHydrated: false,

      setPreferredLocale: (preferredLocale) => set({ preferredLocale }),
      setPreferredVoice: (locale, voice) =>
        set({ preferredVoiceByLocale: { ...get().preferredVoiceByLocale, [locale]: voice } }),
      setDim: (dim) => set({ dim }),
      toggleDim: () => set({ dim: !get().dim }),
      setDefaultSleep: (mode, minutes) =>
        set({ defaultSleep: { mode, minutes: minutes ?? get().defaultSleep.minutes } }),
      setDefaultAmbience: (track, level) =>
        set({ defaultAmbience: { track, level: level ?? get().defaultAmbience.level } }),
      setDefaultRate: (defaultRate) => set({ defaultRate }),
      setContinueToNext: (continueToNext) => set({ continueToNext }),
      setParentGateEnabled: (parentGateEnabled) => set({ parentGateEnabled }),
      dismissInstallBanner: () => set({ installBannerDismissedAt: Date.now() }),
      _setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "nlt:settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        preferredLocale: s.preferredLocale,
        preferredVoiceByLocale: s.preferredVoiceByLocale,
        dim: s.dim,
        defaultSleep: s.defaultSleep,
        defaultAmbience: s.defaultAmbience,
        defaultRate: s.defaultRate,
        continueToNext: s.continueToNext,
        parentGateEnabled: s.parentGateEnabled,
        installBannerDismissedAt: s.installBannerDismissedAt,
      }),
      onRehydrateStorage: () => (state) => state?._setHasHydrated(true),
    },
  ),
);
