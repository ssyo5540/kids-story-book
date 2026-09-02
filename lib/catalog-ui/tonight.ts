import type { StoryCard } from "@/lib/content/catalog";

/** Deterministic daily pick so the whole family sees the same story without a rebuild. */
export function pickTonight<T extends StoryCard>(stories: T[], date = new Date()): T | null {
  if (stories.length === 0) return null;
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let h = 2166136261;
  for (const ch of key) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return stories[h % stories.length] ?? null;
}
