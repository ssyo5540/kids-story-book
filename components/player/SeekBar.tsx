"use client";

import * as Slider from "@radix-ui/react-slider";
import { useEffect, useState } from "react";
import { formatClock } from "@/lib/utils/time";

export function SeekBar({
  position,
  duration,
  buffered,
  onSeek,
  disabled,
}: {
  position: number;
  duration: number;
  buffered: number;
  onSeek: (sec: number) => void;
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  useEffect(() => {
    if (drag !== null && Math.abs(drag - position) < 1) setDrag(null);
  }, [position, drag]);
  const value = drag ?? position;
  const max = Math.max(duration, 1);
  const spoken = `${formatClock(value)} of ${formatClock(duration)}`;
  return (
    <div className="space-y-1.5">
      <Slider.Root
        className="relative flex h-8 w-full touch-none select-none items-center"
        min={0}
        max={max}
        step={1}
        value={[Math.min(value, max)]}
        disabled={disabled}
        onValueChange={([v]) => setDrag(v)}
        onValueCommit={([v]) => {
          onSeek(v);
          setDrag(v);
        }}
        aria-label="Story position"
      >
        <Slider.Track className="relative h-2 grow overflow-hidden rounded-pill bg-white/15">
          <div
            className="absolute inset-y-0 left-0 rounded-pill bg-white/15"
            style={{ width: `${Math.min(100, (buffered / max) * 100)}%` }}
            aria-hidden="true"
          />
          <Slider.Range className="absolute h-full rounded-pill bg-accent" />
        </Slider.Track>
        <Slider.Thumb
          className="block h-6 w-6 rounded-full border-2 border-night-900 bg-moon shadow-lift focus:outline-none focus-visible:shadow-glow"
          aria-valuetext={spoken}
        />
      </Slider.Root>
      <div className="flex justify-between font-display text-xs font-bold text-fg-muted tabular-nums">
        <span>{formatClock(value)}</span>
        <span>-{formatClock(Math.max(0, duration - value))}</span>
      </div>
    </div>
  );
}
