import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { getPublicCatalog } from "@/lib/content/server";

export const metadata: Metadata = { title: "Stories" };

export default async function CollectionsPage() {
  const catalog = await getPublicCatalog();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">The bookshelf</h1>
        <p className="text-fg-muted">
          {catalog.stories.length} stories in {catalog.collections.length} collections. Pick a length, a world, or
          search by name.
        </p>
      </header>
      <Suspense fallback={<div className="h-28 animate-pulse rounded-card bg-white/5" aria-hidden="true" />}>
        <CatalogBrowser catalog={catalog} />
      </Suspense>
    </div>
  );
}
