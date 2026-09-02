import type { StoryCard } from "@/lib/content/catalog";
import { DURATION_CLASSES, type DurationClass, MYTHOLOGIES, type Mythology } from "@/lib/content/types";
import { matchesQuery } from "./search";

export interface Filters {
  duration: DurationClass[];
  myth: Mythology[];
  collection: string[];
  q: string;
}

export const EMPTY_FILTERS: Filters = { duration: [], myth: [], collection: [], q: "" };

type ParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

function getParam(sp: ParamsLike, key: string): string {
  if (sp instanceof URLSearchParams) return sp.get(key) ?? "";
  const v = sp[key];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function csv(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseFilters(sp: ParamsLike): Filters {
  const duration = csv(getParam(sp, "duration"))
    .map(Number)
    .filter((n): n is DurationClass => (DURATION_CLASSES as readonly number[]).includes(n))
    .sort((a, b) => a - b);
  const myth = csv(getParam(sp, "myth"))
    .filter((m): m is Mythology => (MYTHOLOGIES as readonly string[]).includes(m))
    .sort();
  const collection = [...new Set(csv(getParam(sp, "collection")))].sort();
  const q = getParam(sp, "q").trim().slice(0, 80);
  return { duration: [...new Set(duration)], myth: [...new Set(myth)], collection, q };
}

/** Canonical query string (no leading "?"). Empty when nothing is active. */
export function serializeFilters(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.collection.length) sp.set("collection", [...f.collection].sort().join(","));
  if (f.duration.length) sp.set("duration", [...f.duration].sort((a, b) => a - b).join(","));
  if (f.myth.length) sp.set("myth", [...f.myth].sort().join(","));
  if (f.q) sp.set("q", f.q);
  return sp.toString();
}

export function hasActiveFilters(f: Filters): boolean {
  return f.duration.length > 0 || f.myth.length > 0 || f.collection.length > 0 || f.q.length > 0;
}

export function applyFilters(stories: StoryCard[], f: Filters): StoryCard[] {
  return stories.filter((s) => {
    if (f.duration.length && !f.duration.includes(s.durationClass)) return false;
    if (f.myth.length && !f.myth.includes(s.mythology)) return false;
    if (f.collection.length && !f.collection.includes(s.collection)) return false;
    if (f.q && !matchesQuery(s, f.q)) return false;
    return true;
  });
}

export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
