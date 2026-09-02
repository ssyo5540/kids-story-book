import type { StoryCard } from "@/lib/content/catalog";
import { BookCoverCard } from "./BookCoverCard";

export function StoryGrid({ stories, showCollection = false }: { stories: StoryCard[]; showCollection?: boolean }) {
  return (
    <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {stories.map((s) => (
        <li key={s.id}>
          <BookCoverCard story={s} showCollection={showCollection} />
        </li>
      ))}
    </ul>
  );
}
