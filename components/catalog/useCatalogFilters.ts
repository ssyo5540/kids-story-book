"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { EMPTY_FILTERS, type Filters, parseFilters, serializeFilters } from "@/lib/catalog-ui/filters";

export function useCatalogFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => parseFilters(sp ?? new URLSearchParams()), [sp]);

  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...filters, ...patch };
      const qs = serializeFilters(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const clear = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  return { filters, setFilters, clear, isEmpty: serializeFilters(filters) === serializeFilters(EMPTY_FILTERS) };
}
