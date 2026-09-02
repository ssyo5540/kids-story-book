"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { usePlayerStore } from "@/lib/store/playerStore";
import { cn } from "@/lib/utils/cn";

export function PlayerControls({ size = "lg" }: { size?: "sm" | "lg" }) {
  const status = usePlayerStore((s) => s.status);
  const toggle = usePlayerStore((s) => s.toggle);
  const skip = usePlayerStore((s) => s.skip);
  const busy = status === "preparing" || status === "loading";
  const playing = status === "playing" || status === "buffering";
  const big = size === "lg";
  return (
    <div className={cn("flex items-center justify-center", big ? "gap-6" : "gap-2")}>
      {big ? (
        <button
          type="button"
          onClick={() => skip(-15)}
          disabled={busy}
          aria-label="Back 15 seconds"
          className="relative inline-flex h-tap w-tap items-center justify-center rounded-pill text-fg hover:bg-white/10 disabled:opacity-40"
        >
          <RotateCcw className="h-7 w-7" aria-hidden="true" />
          <span className="absolute text-[0.55rem] font-bold">15</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={playing ? "Pause" : "Play"}
        className={cn(
          "inline-flex items-center justify-center rounded-pill bg-accent text-accent-ink shadow-lift transition hover:brightness-105 disabled:opacity-60",
          big ? "h-20 w-20" : "h-11 w-11",
          status === "buffering" && "animate-pulse",
        )}
      >
        {playing ? (
          <Pause className={big ? "h-9 w-9" : "h-5 w-5"} fill="currentColor" aria-hidden="true" />
        ) : (
          <Play className={cn(big ? "h-9 w-9" : "h-5 w-5", "translate-x-0.5")} fill="currentColor" aria-hidden="true" />
        )}
      </button>
      {big ? (
        <button
          type="button"
          onClick={() => skip(15)}
          disabled={busy}
          aria-label="Forward 15 seconds"
          className="relative inline-flex h-tap w-tap items-center justify-center rounded-pill text-fg hover:bg-white/10 disabled:opacity-40"
        >
          <RotateCw className="h-7 w-7" aria-hidden="true" />
          <span className="absolute text-[0.55rem] font-bold">15</span>
        </button>
      ) : null}
    </div>
  );
}
