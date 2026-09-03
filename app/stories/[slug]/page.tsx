import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoverArt } from "@/components/catalog/CoverArt";
import { DurationBadge } from "@/components/catalog/DurationBadge";
import { MythologyTag } from "@/components/catalog/MythologyTag";
import { DownloadButton } from "@/components/downloads/DownloadButton";
import { NarrationLanguages } from "@/components/story/NarrationLanguages";
import { PlayButton } from "@/components/story/PlayButton";
import { StoryText, type StoryTextProps } from "@/components/story/StoryText";
import { findStory, getPublicCatalog, publishedLangs } from "@/lib/content/server";
import { LANG_INFO, type Lang } from "@/lib/content/types";
import { formatDurationClass } from "@/lib/utils/time";

// Rendered per request so the publishing gate is a runtime decision, not a build-time one.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/stories/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const catalog = await getPublicCatalog();
  const s = catalog.stories.find((x) => x.id === slug);
  return s ? { title: s.title.en, description: s.summary.en } : {};
}

export default async function StoryPage(props: PageProps<"/stories/[slug]">) {
  const { slug } = await props.params;
  const [publicCatalog, found] = await Promise.all([getPublicCatalog(), findStory(slug)]);
  const card = publicCatalog.stories.find((s) => s.id === slug);
  if (!card || !found) notFound();

  const langs = publishedLangs(found.story);
  const texts: StoryTextProps["texts"] = {};
  for (const l of langs) {
    const t = found.story.texts[l];
    if (t) texts[l] = { paragraphs: t.paragraphs, review: t.reviewStatus, title: t.title };
  }
  const nativeTitles = langs.filter((l) => l !== "en" && card.title[l] && card.title[l] !== card.title.en) as Lang[];

  return (
    <div className="space-y-10">
      <Link
        href={`/collections/${card.collection}`}
        className="inline-flex items-center gap-1 font-display text-sm font-bold text-fg-muted hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {card.collectionTitle.en}
      </Link>

      <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative w-44 shrink-0 sm:w-56">
          <div className="aspect-[3/4] overflow-hidden rounded-r-card rounded-l-md shadow-cover">
            <div
              className="absolute inset-y-0 left-0 z-10 w-2.5 bg-gradient-to-r from-black/60 via-black/25 to-transparent"
              aria-hidden="true"
            />
            <CoverArt symbol={card.cover.symbol} accent={card.cover.accent} title={`Cover of ${card.title.en}`} />
          </div>
          <DurationBadge d={card.durationClass} className="absolute right-2 top-2 z-10" />
        </div>

        <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <MythologyTag m={card.mythology} />
              {found.story.texts.en?.reviewStatus !== "approved" ? (
                <span
                  className="rounded-pill border border-dashed border-lamp-300/60 bg-lamp-300/10 px-2.5 py-0.5 font-display text-xs font-bold text-lamp-200"
                  title="This story has not been checked by a reviewer yet"
                >
                  Not yet reviewed
                </span>
              ) : null}
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-balance sm:text-5xl">
              {card.title.en}
            </h1>
            {nativeTitles.length ? (
              <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-display text-lg text-fg-muted sm:justify-start">
                {nativeTitles.map((l) => (
                  <span key={l} lang={LANG_INFO[l].htmlLang}>
                    {card.title[l]}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          <p className="text-lg text-fg-muted">{card.summary.en}</p>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-fg-muted sm:justify-start">
            <li>{formatDurationClass(card.durationClass)}</li>
            <li>
              Ages {card.ageRange[0]}–{card.ageRange[1]}
            </li>
            <li>About {card.wordCount.toLocaleString()} words</li>
          </ul>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <PlayButton story={card} />
            <DownloadButton story={card} />
          </div>
          <NarrationLanguages story={card} />
        </div>
      </header>

      <aside className="paper mx-auto max-w-2xl rounded-card px-5 py-4">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-on-surface-muted">
          For grown-ups · the gentle lesson
        </p>
        <p className="mt-1 text-on-surface">{card.moral.en}</p>
      </aside>

      <section aria-labelledby="read-along" className="space-y-4">
        <h2 id="read-along" className="text-center font-display text-2xl font-extrabold sm:text-left">
          Read along
        </h2>
        <StoryText texts={texts} initialLang="en" />
      </section>
    </div>
  );
}
