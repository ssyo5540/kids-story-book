"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { engine } from "@/lib/player/engine";
import { usePlayerStore } from "@/lib/store/playerStore";

/** Plays one voice preview at a time, pausing the story meanwhile and resuming afterwards. */
export function usePreview() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const resume = useRef(false);

  useEffect(() => {
    const off = engine.on((e) => {
      if (e.type !== "previewended") return;
      setPlayingId(null);
      if (resume.current) {
        resume.current = false;
        void usePlayerStore.getState().play();
      }
    });
    return () => {
      off();
      engine.preview.stop();
    };
  }, []);

  const toggle = useCallback(
    async (id: string, url: string) => {
      if (playingId === id) {
        engine.preview.stop();
        setPlayingId(null);
        if (resume.current) {
          resume.current = false;
          void usePlayerStore.getState().play();
        }
        return;
      }
      const s = usePlayerStore.getState();
      if (s.status === "playing" || s.status === "buffering") {
        resume.current = true;
        s.pause();
      }
      setPlayingId(id);
      try {
        await engine.preview.play(url);
      } catch {
        setPlayingId(null);
      }
    },
    [playingId],
  );

  return { playingId, toggle };
}
