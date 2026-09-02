import { getConfig } from "@/lib/config";
import { applyPublishingGate, readContent } from "@/lib/content/loader";
import type { Catalog, Story } from "@/lib/content/types";

/** Load content for CLI runs, optionally including needs_review texts. Throws on content errors. */
export async function loadCliCatalog(allowUnreviewed: boolean): Promise<Catalog> {
  const cfg = getConfig();
  const raw = await readContent(cfg.CONTENT_DIR);
  const errors = raw.issues.filter((i) => i.level === "error");
  if (errors.length) {
    for (const e of errors) console.error(`ERROR ${e.file}: ${e.message}`);
    throw new Error(`content has ${errors.length} error(s)`);
  }
  return applyPublishingGate(raw, allowUnreviewed);
}

export function selectStories(catalog: Catalog, opts: { story?: string; collection?: string }): Story[] {
  let list = catalog.stories;
  if (opts.story) list = list.filter((s) => s.meta.id === opts.story);
  if (opts.collection) list = list.filter((s) => s.meta.collection === opts.collection);
  return list;
}

export function collectionTitle(catalog: Catalog, story: Story): string {
  return catalog.collections.find((c) => c.id === story.meta.collection)?.title.en ?? story.meta.collection;
}

export function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

export function usd(chars: number): string {
  return `$${((chars / 1_000_000) * 30).toFixed(2)}`;
}

export function bar(pct: number, width = 24): string {
  const n = Math.round((Math.min(100, Math.max(0, pct)) / 100) * width);
  return `[${"#".repeat(n)}${".".repeat(width - n)}]`;
}
