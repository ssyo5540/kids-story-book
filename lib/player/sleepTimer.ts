export const FADE_MS = 20_000;

/** 1 → 0 gain over the last `fadeMs` before `endsAtMs`, eased so the drop is gentle. */
export function fadeGain(nowMs: number, endsAtMs: number, fadeMs = FADE_MS): number {
  const remaining = endsAtMs - nowMs;
  if (remaining <= 0) return 0;
  if (remaining >= fadeMs) return 1;
  const t = remaining / fadeMs;
  return t * t;
}

/** Wall-clock end for "end of story" mode, given the current position and playback rate. */
export function endOfStoryEndsAt(nowMs: number, positionSec: number, durationSec: number, rate: number): number {
  const remaining = Math.max(0, durationSec - positionSec) / Math.max(0.25, rate);
  return nowMs + remaining * 1000;
}
