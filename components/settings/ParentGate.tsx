"use client";

import { Lock } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ProgressRing } from "@/components/player/PreparingState";
import { useHasHydrated } from "@/lib/store/hydration";
import { useSettingsStore } from "@/lib/store/settingsStore";

const HOLD_MS = 2000;

/** Press-and-hold gate for grown-up screens. A convenience against tiny fingers, not a security boundary. */
export function ParentGate({ children }: { children: ReactNode }) {
  const enabled = useSettingsStore((s) => s.parentGateEnabled);
  const hydrated = useHasHydrated();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);
  const start = useRef(0);

  useEffect(() => {
    if (!enabled) setOpen(true);
  }, [enabled]);

  const begin = () => {
    start.current = Date.now();
    const tick = () => {
      const p = Math.min(100, ((Date.now() - start.current) / HOLD_MS) * 100);
      setProgress(p);
      if (p >= 100) {
        setOpen(true);
        timer.current = null;
        return;
      }
      timer.current = window.setTimeout(tick, 50);
    };
    tick();
  };
  const end = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setProgress(0);
  };

  if (!hydrated) return <div className="h-40 animate-pulse rounded-card bg-white/5" aria-hidden="true" />;
  if (open || !enabled) return <>{children}</>;

  return (
    <div className="mx-auto max-w-sm space-y-4 rounded-sheet border border-line bg-white/5 p-8 text-center">
      <p className="font-display text-xl font-extrabold">Grown-ups only</p>
      <p className="text-sm text-fg-muted">Press and hold the lock for two seconds to open the settings.</p>
      <button
        type="button"
        onPointerDown={begin}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lift focus-visible:shadow-glow"
        aria-label="Hold to open settings"
      >
        <ProgressRing percent={progress} className="absolute inset-0 h-24 w-24 text-night-950" />
        <Lock className="h-9 w-9" aria-hidden="true" />
      </button>
    </div>
  );
}
