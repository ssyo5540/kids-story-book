import Link from "next/link";
import type { StoryCard } from "@/lib/content/catalog";
import { cn } from "@/lib/utils/cn";
import { CoverArt } from "./CoverArt";
import { DurationBadge } from "./DurationBadge";
import { NativeTitle } from "./NativeTitle";

export function BookCoverCard({
  story,
  size = "md",
  showCollection = false,
  className,
}: {
  story: StoryCard;
  size?: "sm" | "md" | "lg";
  showCollection?: boolean;
  className?: string;
}) {
  const widths = { sm: "w-32", md: "w-40 sm:w-44", lg: "w-52 sm:w-60" };
  return (
    <Link
      href={`/stories/${story.id}`}
      className={cn("group block shrink-0 focus-visible:outline-none", widths[size], className)}
      aria-label={`${story.title.en}, ${story.durationClass} minute story`}
    >
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-r-card rounded-l-md shadow-cover transition duration-300",
          "group-hover:-translate-y-1 group-hover:shadow-lift group-focus-visible:shadow-glow motion-reduce:transition-none",
        )}
      >
        {/* spine */}
        <div
          className="absolute inset-y-0 left-0 z-10 w-2.5 bg-gradient-to-r from-black/60 via-black/25 to-transparent"
          aria-hidden="true"
        />
        <CoverArt symbol={story.cover.symbol} accent={story.cover.accent} />
        <DurationBadge d={story.durationClass} className="absolute right-2 top-2 z-10" />
        {/* title plate */}
        <div className="paper absolute inset-x-3 bottom-3 z-10 rounded-md px-2.5 py-2 text-center shadow-lift">
          <div
            className="mx-auto mb-1 h-0.5 w-8 rounded-full"
            style={{ background: story.cover.accent }}
            aria-hidden="true"
          />
          <div className="font-display text-sm font-extrabold leading-tight text-on-surface text-balance">
            {story.title.en}
          </div>
          <NativeTitle title={story.title} className="mt-0.5 block text-xs font-bold text-on-surface-muted" />
        </div>
      </div>
      {showCollection ? (
        <div className="mt-2 truncate px-1 text-xs text-fg-muted">{story.collectionTitle.en}</div>
      ) : null}
    </Link>
  );
}
