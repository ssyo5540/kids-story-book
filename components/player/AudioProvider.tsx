"use client";

import { useEffect, useRef } from "react";
import { engine } from "@/lib/player/engine";
import { bindHandlers, updatePosition } from "@/lib/player/mediaSession";
import { usePlayerStore } from "@/lib/store/playerStore";

/**
 * Mounts the three persistent <audio> elements once at the app root and wires the engine to the store.
 * Narration uses crossOrigin so the service worker's cached (CORS) responses can serve it offline.
 */
export function AudioProvider() {
  const narration = useRef<HTMLAudioElement>(null);
  const ambience = useRef<HTMLAudioElement>(null);
  const preview = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!narration.current || !ambience.current || !preview.current) return;
    const detach = engine.attach({
      narration: narration.current,
      ambience: ambience.current,
      preview: preview.current,
    });
    engine.preview.previewElRef = preview.current;

    const off = engine.on((e) => {
      const s = usePlayerStore.getState();
      switch (e.type) {
        case "time":
          s._sync({ position: e.position, duration: e.duration || s.duration, buffered: e.buffered });
          s._tick(Date.now());
          if (s.status === "playing") updatePosition(e.position, e.duration || s.duration, s.rate);
          break;
        case "duration":
          if (e.duration) s._sync({ duration: e.duration });
          break;
        case "status":
          s._status(e.status);
          break;
        case "error":
          s._error({ code: e.code, message: e.message });
          break;
        default:
          break;
      }
    });

    const unbind = bindHandlers({
      play: () => void usePlayerStore.getState().play(),
      pause: () => usePlayerStore.getState().pause(),
      stop: () => usePlayerStore.getState().stop(),
      seekBackward: () => usePlayerStore.getState().skip(-15),
      seekForward: () => usePlayerStore.getState().skip(15),
      seekTo: (sec) => usePlayerStore.getState().seek(sec),
    });

    // Timers are throttled in the background: resync from the element whenever we come back.
    const resync = () => {
      const s = usePlayerStore.getState();
      if (!engine.hasSource) return;
      s._sync({ position: engine.position, duration: engine.duration || s.duration });
      s._tick(Date.now());
      if (s.status === "playing" && engine.paused) s._status("paused");
      if ((s.status === "paused" || s.status === "buffering") && !engine.paused) s._status("playing");
    };
    const onVisibility = () => {
      if (!document.hidden) resync();
    };
    const onHide = () => {
      const s = usePlayerStore.getState();
      if (s.now) s._sync({ position: engine.position });
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", resync);
    window.addEventListener("pagehide", onHide);

    return () => {
      off();
      unbind();
      detach();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", resync);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return (
    <div hidden aria-hidden="true">
      {/* biome-ignore lint/a11y/useMediaCaption: narration audio has its own read-along text */}
      <audio ref={narration} preload="metadata" crossOrigin="anonymous" playsInline />
      {/* biome-ignore lint/a11y/useMediaCaption: background ambience */}
      <audio ref={ambience} preload="none" loop playsInline />
      {/* biome-ignore lint/a11y/useMediaCaption: short voice previews */}
      <audio ref={preview} preload="none" playsInline />
    </div>
  );
}
