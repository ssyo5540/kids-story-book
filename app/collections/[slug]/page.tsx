import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { CoverArt } from "@/components/catalog/CoverArt";
import { MythologyTag } from "@/components/catalog/MythologyTag";
import { getPublicCatalog } from "@/lib/content/server";
import { formatDurationClass } from "@/lib/utils/time";

export async function generateStaticParams() {
  const catalog = await getPublicCatalog();
  return catalog.collections.map((c) => ({ slug: c.id }));
}

export async function generateMetadata(props: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const catalog = await getPublicCatalog();
  const c = catalog.collections.find((x) => x.id === slug);
  return c ? { title: c.title.en, description: c.description.en } : {};
}

export default async function CollectionPage(props: PageProps<"/collections/[slug]">) {
  const { slug } = await props.params;
  const catalog = await getPublicCatalog();
  const collection = catalog.collections.find((c) => c.id === slug);
  if (!collection) notFound();

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-5">
        <div className="h-28 w-[5.25rem] shrink-0 overflow-hidden rounded-r-card rounded-l-md shadow-cover sm:h-36 sm:w-[6.75rem]">
          <CoverArt symbol={collection.cover.symbol} accent={collection.cover.accent} />
        </div>
        <div className="min-w-0 space-y-1">
          <MythologyTag m={collection.mythology} />
          <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{collection.title.en}</h1>
          <p className="text-fg-muted">{collection.description.en}</p>
          <p className="text-sm text-fg-muted">
            {collection.storyCount} {collection.storyCount === 1 ? "story" : "stories"} ·{" "}
            {collection.durations.map(formatDurationClass).join(", ")}
          </p>
        </div>
      </header>
      <Suspense fallback={<div className="h-28 animate-pulse rounded-card bg-white/5" aria-hidden="true" />}>
        <CatalogBrowser catalog={catalog} scope={collection.id} />
      </Suspense>
    </div>
  );
}
