import type { Catalog, CoverArt, DurationClass, Lang, Mythology, ReviewStatus } from "./types";
import { LANGS } from "./types";

export type Localized = Partial<Record<Lang, string>> & { en: string };

/** Serializable, client-safe view of a story (no bodies). */
export interface StoryCard {
  id: string;
  collection: string;
  collectionTitle: Localized;
  mythology: Mythology;
  durationClass: DurationClass;
  ageRange: [number, number];
  order: number;
  cover: CoverArt;
  title: Localized;
  summary: Localized;
  moral: Localized;
  /** Languages whose text passed the publishing gate. */
  langs: Lang[];
  review: Partial<Record<Lang, ReviewStatus>>;
  contentHash: Partial<Record<Lang, string>>;
  wordCount: number;
  paragraphCount: number;
  tags: string[];
}

export interface CollectionCard {
  id: string;
  mythology: Mythology;
  order: number;
  cover: CoverArt;
  title: Localized;
  description: Localized;
  storyCount: number;
  durations: DurationClass[];
}

export interface PublicCatalog {
  collections: CollectionCard[];
  stories: StoryCard[];
  loadedAt: string;
}

export const DEFAULT_COVER: CoverArt = { accent: "#f6b73c", symbol: "moon" };

export function toPublicCatalog(catalog: Catalog): PublicCatalog {
  const stories: StoryCard[] = catalog.stories.map((s) => {
    const en = s.texts.en;
    if (!en) throw new Error(`story ${s.meta.id} has no en text after gate`);
    const collection = catalog.collections.find((c) => c.id === s.meta.collection);
    const title: Localized = { en: en.title };
    const summary: Localized = { en: en.summary };
    const moral: Localized = { en: en.moral };
    const review: StoryCard["review"] = {};
    const contentHash: StoryCard["contentHash"] = {};
    const langs: Lang[] = [];
    for (const lang of LANGS) {
      const t = s.texts[lang];
      if (!t) continue;
      langs.push(lang);
      title[lang] = t.title;
      summary[lang] = t.summary;
      moral[lang] = t.moral;
      review[lang] = t.reviewStatus;
      contentHash[lang] = t.contentHash;
    }
    return {
      id: s.meta.id,
      collection: s.meta.collection,
      collectionTitle: collection?.title ?? { en: s.meta.collection },
      mythology: s.meta.mythology,
      durationClass: s.meta.durationClass,
      ageRange: s.meta.ageRange,
      order: s.meta.order,
      cover: s.meta.cover ?? collection?.cover ?? DEFAULT_COVER,
      title,
      summary,
      moral,
      langs,
      review,
      contentHash,
      wordCount: en.wordCount,
      paragraphCount: en.paragraphs.length,
      tags: s.meta.tags,
    };
  });

  const collections: CollectionCard[] = catalog.collections.map((c) => {
    const own = stories.filter((s) => s.collection === c.id);
    return {
      id: c.id,
      mythology: c.mythology,
      order: c.order,
      cover: c.cover ?? DEFAULT_COVER,
      title: c.title,
      description: c.description,
      storyCount: own.length,
      durations: [...new Set(own.map((s) => s.durationClass))].sort((a, b) => a - b) as DurationClass[],
    };
  });

  return { collections, stories, loadedAt: catalog.loadedAt };
}

/** Pick a localized string with English fallback. */
export function pick(loc: Localized | undefined, lang: Lang): string {
  if (!loc) return "";
  return loc[lang] ?? loc.en;
}
