"use client";

import { useEffect } from "react";
import { useLibraryStore } from "./libraryStore";
import { useSettingsStore } from "./settingsStore";

/** Rehydrate persisted stores after mount (skipHydration avoids SSR mismatches). */
export function useHydrateStores() {
  useEffect(() => {
    for (const store of [useSettingsStore, useLibraryStore]) {
      try {
        store.persist.rehydrate();
      } catch {
        store.getState()._setHasHydrated(true);
      }
    }
  }, []);
}

export function useHasHydrated(): boolean {
  return useSettingsStore((s) => s.hasHydrated);
}
