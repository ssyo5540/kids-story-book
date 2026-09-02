import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { CollectionCard, StoryCard } from "@/lib/content/catalog";
import { BookCoverCard } from "./BookCoverCard";
import { MythologyTag } from "./MythologyTag";

export function CollectionShelf({ collection, stories }: { collection: CollectionCard; stories: StoryCard[] }) {
  if (stories.length === 0) return null;
  return (
    <section aria-labelledby={`shelf-${collection.id}`} className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <MythologyTag m={collection.mythology} />
          <h2 id={`shelf-${collection.id}`} className="font-display text-2xl font-extrabold leading-tight">
            <Link href={`/collections/${collection.id}`} className="hover:text-accent">
              {collection.title.en}
            </Link>
          </h2>
        </div>
        <Link
          href={`/collections/${collection.id}`}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-pill px-3 font-display text-sm font-bold text-fg-muted hover:bg-white/10 hover:text-fg"
        >
          All {collection.storyCount} <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="relative -mx-4 sm:-mx-6">
        {/* shelf plank */}
        <div
          className="pointer-events-none absolute inset-x-4 bottom-1 h-3 rounded-full bg-gradient-to-b from-night-600 to-night-800 shadow-lift sm:inset-x-6"
          aria-hidden="true"
        />
        <ul className="shelf flex gap-4 overflow-x-auto px-4 pb-5 pt-2 sm:px-6">
          {stories.map((s) => (
            <li key={s.id}>
              <BookCoverCard story={s} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
