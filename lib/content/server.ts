import { type PublicCatalog, toPublicCatalog } from "./catalog";
import { getCatalog } from "./loader";
import type { Catalog, Lang, Story } from "./types";

type G = typeof globalThis & { __nightlightPublicCatalog?: Promise<PublicCatalog> };

/** Client-safe catalog (no bodies), memoized alongside the full catalog. */
export function getPublicCatalog(): Promise<PublicCatalog> {
  const g = globalThis as G;
  if (!g.__nightlightPublicCatalog) g.__nightlightPublicCatalog = getCatalog().then(toPublicCatalog);
  return g.__nightlightPublicCatalog;
}

export async function findStory(id: string): Promise<{ catalog: Catalog; story: Story } | null> {
  const catalog = await getCatalog();
  const story = catalog.stories.find((s) => s.meta.id === id);
  return story ? { catalog, story } : null;
}

export function publishedLangs(story: Story): Lang[] {
  return (Object.keys(story.texts) as Lang[]).filter((l) => !!story.texts[l]);
}
