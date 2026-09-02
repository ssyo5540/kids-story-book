"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Locale } from "@/lib/content/types";

export interface SavedPosition {
  position: number;
  duration: number;
  locale: Locale;
  voice: string;
  updatedAt: number;
  completed: boolean;
}

export interface RecentEntry {
  storyId: string;
  locale: Locale;
  voice: string;
  playedAt: number;
}

export interface LibraryState {
  favourites: string[];
  recents: RecentEntry[];
  positions: Record<string, SavedPosition>;
  hasHydrated: boolean;

  toggleFavourite(storyId: string): void;
  isFavourite(storyId: string): boolean;
  touchRecent(entry: Omit<RecentEntry, "playedAt">): void;
  savePosition(storyId: string, p: Omit<SavedPosition, "updatedAt" | "completed">): void;
  markCompleted(storyId: string): void;
  clearAll(): void;
  _setHasHydrated(v: boolean): void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favourites: [],
      recents: [],
      positions: {},
      hasHydrated: false,

      toggleFavourite: (id) =>
        set((s) => ({
          favourites: s.favourites.includes(id) ? s.favourites.filter((x) => x !== id) : [id, ...s.favourites],
        })),
      isFavourite: (id) => get().favourites.includes(id),
      touchRecent: (entry) =>
        set((s) => ({
          recents: [{ ...entry, playedAt: Date.now() }, ...s.recents.filter((r) => r.storyId !== entry.storyId)].slice(
            0,
            20,
          ),
        })),
      savePosition: (storyId, p) =>
        set((s) => ({
          positions: {
            ...s.positions,
            [storyId]: {
              ...p,
              updatedAt: Date.now(),
              completed:
                s.positions[storyId]?.completed && p.position > 0 ? false : (s.positions[storyId]?.completed ?? false),
            },
          },
        })),
      markCompleted: (storyId) =>
        set((s) => {
          const prev = s.positions[storyId];
          if (!prev) return {};
          return {
            positions: { ...s.positions, [storyId]: { ...prev, position: 0, completed: true, updatedAt: Date.now() } },
          };
        }),
      clearAll: () => set({ favourites: [], recents: [], positions: {} }),
      _setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "nlt:library",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ favourites: s.favourites, recents: s.recents, positions: s.positions }),
      onRehydrateStorage: () => (state) => state?._setHasHydrated(true),
    },
  ),
);
