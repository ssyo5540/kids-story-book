import type { StoryCard } from "@/lib/content/catalog";
import type { DurationClass, Mythology } from "@/lib/content/types";

const MYTH_WORDS: Record<Mythology, string[]> = {
  indian: ["indian", "india", "hindu", "bharat"],
  greek: ["greek", "greece", "olympus"],
  egyptian: ["egyptian", "egypt", "nile"],
};

const DURATION_WORDS: Record<DurationClass, string[]> = {
  5: ["5 min", "5 minutes", "five", "short"],
  15: ["15 min", "15 minutes", "fifteen"],
  30: ["30 min", "30 minutes", "thirty", "half an hour"],
  60: ["60 min", "1 hour", "one hour", "sixty", "long"],
};

export function normalizeQuery(s: string): string {
  return s.normalize("NFC").toLocaleLowerCase().trim();
}

/** Simple substring search over titles (all languages), collection titles, tags, mythology and duration words. */
export function matchesQuery(story: StoryCard, rawQuery: string): boolean {
  const q = normalizeQuery(rawQuery);
  if (!q) return true;
  const hay: string[] = [
    ...Object.values(story.title),
    ...Object.values(story.collectionTitle),
    ...story.tags.map((t) => t.replace(/-/g, " ")),
    ...MYTH_WORDS[story.mythology],
    ...DURATION_WORDS[story.durationClass],
  ];
  return hay.some((h) => normalizeQuery(h).includes(q));
}
