"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { applyFilters, hasActiveFilters } from "@/lib/catalog-ui/filters";
import type { PublicCatalog } from "@/lib/content/catalog";
import { CollectionShelf } from "./CollectionShelf";
import { FilterBar } from "./FilterBar";
import { StoryGrid } from "./StoryGrid";
import { useCatalogFilters } from "./useCatalogFilters";

/** Filterable catalog: shelves per collection, or a flat grid when searching / scoped to one collection. */
export function CatalogBrowser({ catalog, scope }: { catalog: PublicCatalog; scope?: string }) {
  const { filters, clear } = useCatalogFilters();
  const base = scope ? catalog.stories.filter((s) => s.collection === scope) : catalog.stories;
  const filtered = applyFilters(base, { ...filters, collection: scope ? [] : filters.collection });
  const active = hasActiveFilters(filters);
  const flat = !!scope || filters.q.length > 0;

  return (
    <div className="space-y-8">
      <FilterBar collections={catalog.collections} hideCollection={!!scope} />

      {filtered.length === 0 ? (
        <EmptyState
          title="No stories match tonight"
          body="Try fewer filters, or a different word. Every story is waiting on the shelf."
          action={
            active ? (
              <Button variant="secondary" onClick={clear}>
                Clear filters
              </Button>
            ) : (
              <Link href="/collections">
                <Button variant="secondary">Browse all</Button>
              </Link>
            )
          }
        />
      ) : flat ? (
        <section aria-label="Results" className="space-y-3">
          <p className="text-sm text-fg-muted">
            {filtered.length} {filtered.length === 1 ? "story" : "stories"}
          </p>
          <StoryGrid stories={filtered} showCollection={!scope} />
        </section>
      ) : (
        catalog.collections.map((c) => (
          <CollectionShelf key={c.id} collection={c} stories={filtered.filter((s) => s.collection === c.id)} />
        ))
      )}
    </div>
  );
}
