"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { toggleValue } from "@/lib/catalog-ui/filters";
import type { CollectionCard } from "@/lib/content/catalog";
import { DURATION_CLASSES, MYTHOLOGIES } from "@/lib/content/types";
import { formatDurationClass } from "@/lib/utils/time";
import { MoonPhase } from "./DurationBadge";
import { MYTH_LABEL } from "./MythologyTag";
import { useCatalogFilters } from "./useCatalogFilters";

export function FilterBar({
  collections,
  hideCollection = false,
}: {
  collections: CollectionCard[];
  hideCollection?: boolean;
}) {
  const { filters, setFilters, clear, isEmpty } = useCatalogFilters();
  const [q, setQ] = useState(filters.q);
  const first = useRef(true);

  // keep the input in sync with back/forward navigation
  useEffect(() => {
    setQ(filters.q);
  }, [filters.q]);

  // debounce typing before touching the URL
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (q === filters.q) return;
    const t = setTimeout(() => setFilters({ q }), 200);
    return () => clearTimeout(t);
  }, [q, filters.q, setFilters]);

  return (
    <search className="space-y-3" aria-label="Find a story">
      <label className="relative block">
        <span className="sr-only">Search stories</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stories, heroes, collections…"
          className="h-12 w-full rounded-pill border border-line bg-white/5 pl-12 pr-12 text-base text-fg placeholder:text-fg-muted focus:border-accent focus:bg-white/10 focus:outline-none"
          autoComplete="off"
          enterKeyHint="search"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-pill text-fg-muted hover:bg-white/10"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </label>

      <div className="shelf -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <span className="sr-only">How long?</span>
        {DURATION_CLASSES.map((d) => (
          <Chip
            key={d}
            selected={filters.duration.includes(d)}
            onClick={() => setFilters({ duration: toggleValue(filters.duration, d) })}
            leading={<MoonPhase d={d} className="h-4 w-4" />}
          >
            {formatDurationClass(d)}
          </Chip>
        ))}
        <span className="mx-1 hidden w-px self-stretch bg-line sm:block" aria-hidden="true" />
        {MYTHOLOGIES.map((m) => (
          <Chip
            key={m}
            tone={m}
            selected={filters.myth.includes(m)}
            onClick={() => setFilters({ myth: toggleValue(filters.myth, m) })}
          >
            {MYTH_LABEL[m]}
          </Chip>
        ))}
        {!hideCollection
          ? collections.map((c) => (
              <Chip
                key={c.id}
                selected={filters.collection.includes(c.id)}
                onClick={() => setFilters({ collection: toggleValue(filters.collection, c.id) })}
              >
                {c.title.en}
              </Chip>
            ))
          : null}
        {!isEmpty ? (
          <Chip onClick={clear} leading={<X className="h-4 w-4" aria-hidden="true" />} className="border-dashed">
            Clear
          </Chip>
        ) : null}
      </div>
    </search>
  );
}
