import type { DurationClass } from "@/lib/content/types";

export function formatDurationClass(d: DurationClass): string {
  return d === 60 ? "1 hour" : `${d} min`;
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}

export function formatMinutes(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return "under a minute";
  if (min === 1) return "1 minute";
  if (min < 60) return `${min} minutes`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} h ${rest} min` : `${h} hour${h > 1 ? "s" : ""}`;
}
