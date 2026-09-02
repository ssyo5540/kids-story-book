"use client";

import { Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { pickTonight } from "@/lib/catalog-ui/tonight";
import type { StoryCard } from "@/lib/content/catalog";
import { formatDurationClass } from "@/lib/utils/time";
import { CoverArt } from "./CoverArt";
import { MythologyTag } from "./MythologyTag";
import { NativeTitle } from "./NativeTitle";

export function TonightPick({ stories }: { stories: StoryCard[] }) {
  // Deterministic per calendar day; computed on the client so the static page never goes stale.
  const story = useMemo(() => pickTonight(stories), [stories]);
  if (!story) return null;
  return (
    <section
      aria-labelledby="tonight"
      className="relative overflow-hidden rounded-sheet border border-line bg-night-800/60 p-5 shadow-lift sm:p-7"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Link
          href={`/stories/${story.id}`}
          className="relative mx-auto w-40 shrink-0 sm:mx-0 sm:w-44"
          aria-label={story.title.en}
        >
          <div className="aspect-[3/4] overflow-hidden rounded-r-card rounded-l-md shadow-cover">
            <CoverArt symbol={story.cover.symbol} accent={story.cover.accent} />
          </div>
        </Link>
        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
          <p
            id="tonight"
            className="inline-flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide text-accent"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Tonight's pick
          </p>
          <h2 className="font-display text-3xl font-extrabold leading-tight text-balance sm:text-4xl">
            {story.title.en}
            <NativeTitle title={story.title} className="mt-1 block text-xl text-fg-muted" />
          </h2>
          <p className="text-fg-muted">{story.summary.en}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <MythologyTag m={story.mythology} />
            <span className="text-sm text-fg-muted">{formatDurationClass(story.durationClass)}</span>
            <span className="text-sm text-fg-muted">
              Ages {story.ageRange[0]}–{story.ageRange[1]}
            </span>
          </div>
          <Link
            href={`/stories/${story.id}`}
            className="inline-flex h-14 items-center gap-2 rounded-pill bg-accent px-7 font-display text-lg font-extrabold text-accent-ink shadow-lift transition hover:brightness-105"
          >
            <Play className="h-5 w-5 fill-current" aria-hidden="true" /> Open story
          </Link>
        </div>
      </div>
    </section>
  );
}
