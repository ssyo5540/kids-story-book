import type { AmbienceLevel, AmbienceTrack } from "@/lib/store/settingsStore";

export const AMBIENCE_TRACKS: { id: AmbienceTrack; label: string; blurb: string }[] = [
  { id: "none", label: "Off", blurb: "Just the story" },
  { id: "rain", label: "Rain", blurb: "Soft rain on a roof" },
  { id: "crickets", label: "Night", blurb: "Crickets and a warm breeze" },
  { id: "lullaby", label: "Lullaby", blurb: "A slow music box" },
];

export const AMBIENCE_LEVELS: { level: AmbienceLevel; label: string }[] = [
  { level: 1, label: "Whisper" },
  { level: 2, label: "Soft" },
  { level: 3, label: "Cosy" },
];

/** Loops are shipped pre-levelled because iOS ignores element volume. */
export function ambienceSrc(track: AmbienceTrack, level: AmbienceLevel): string | null {
  if (track === "none" || level === 0) return null;
  return `/ambience/${track}-${level}.mp3`;
}
