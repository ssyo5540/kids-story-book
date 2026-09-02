"use client";

import type { RenditionRef, ResolvedRendition } from "@/lib/api-client/renditions";
import type { RenditionInfo, RenditionManifest } from "@/lib/audio/manifest";
import type { StoryCard } from "@/lib/content/catalog";
import { coverPngUrl } from "@/lib/utils/covers";
import { type DownloadRecord, downloadKey, getDb } from "./db";

export const AUDIO_CACHE = "story-audio-v1";

function abs(url: string) {
  return new URL(url, window.location.href).href;
}

export interface DownloadProgress {
  loaded: number;
  total: number | null;
}

/** Fetch the whole MP3 (a plain 200, never a Range) and store it plus manifest and cover in the Cache API. */
export async function downloadRendition(
  story: StoryCard,
  info: RenditionInfo,
  manifest: RenditionManifest,
  opts: { onProgress?: (p: DownloadProgress) => void; signal?: AbortSignal } = {},
): Promise<DownloadRecord> {
  if (!("caches" in window)) throw new Error("Offline storage is not available in this browser.");
  const cache = await caches.open(AUDIO_CACHE);
  const audioUrl = abs(info.url);
  const manifestUrl = abs(info.manifestUrl);
  const coverUrl = abs(coverPngUrl(story.cover));

  const res = await fetch(audioUrl, { mode: "cors", signal: opts.signal, cache: "no-store" });
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
  const total = Number(res.headers.get("content-length")) || info.bytes || null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      opts.onProgress?.({ loaded, total });
    }
  }
  const blob = new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
  const stored = new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(blob.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
  try {
    await cache.put(audioUrl, stored);
    await cache.put(
      manifestUrl,
      new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/json" } }),
    );
    try {
      const cover = await fetch(coverUrl, { signal: opts.signal });
      if (cover.ok) await cache.put(coverUrl, cover);
    } catch {
      /* optional */
    }
    const record: DownloadRecord = {
      key: downloadKey(story.id, info.locale, info.voice),
      storyId: story.id,
      locale: info.locale,
      voice: info.voice,
      title: story.title.en,
      collectionTitle: story.collectionTitle.en,
      audioUrl,
      manifestUrl,
      coverUrl,
      bytes: blob.size,
      durationMs: info.durationMs,
      renditionHash: info.renditionHash,
      contentHash: info.contentHash,
      createdAt: Date.now(),
    };
    await (await getDb()).put("downloads", record);
    return record;
  } catch (e) {
    await cache.delete(audioUrl);
    await cache.delete(manifestUrl);
    throw e;
  }
}

export async function removeDownload(key: string): Promise<void> {
  const db = await getDb();
  const rec = await db.get("downloads", key);
  if (rec && "caches" in window) {
    const cache = await caches.open(AUDIO_CACHE);
    await Promise.all([cache.delete(rec.audioUrl), cache.delete(rec.manifestUrl), cache.delete(rec.coverUrl)]);
  }
  await db.delete("downloads", key);
}

export async function listDownloads(): Promise<DownloadRecord[]> {
  const db = await getDb();
  const all = await db.getAll("downloads");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function isDownloaded(ref: RenditionRef): Promise<DownloadRecord | null> {
  try {
    const db = await getDb();
    return (await db.get("downloads", downloadKey(ref.storyId, ref.locale, ref.voice))) ?? null;
  } catch {
    return null;
  }
}

/** Any downloaded rendition of a story (used to play offline regardless of the requested voice). */
export async function anyDownloadFor(storyId: string): Promise<DownloadRecord | null> {
  try {
    const db = await getDb();
    const list = await db.getAllFromIndex("downloads", "byStory", storyId);
    return list[0] ?? null;
  } catch {
    return null;
  }
}

/** Resolve a downloaded rendition into what the player needs, reading the manifest from the cache. */
export async function resolveFromDownload(ref: RenditionRef): Promise<ResolvedRendition | null> {
  if (typeof window === "undefined" || !("caches" in window)) return null;
  const rec = (await isDownloaded(ref)) ?? (navigator.onLine ? null : await anyDownloadFor(ref.storyId));
  if (!rec) return null;
  const cache = await caches.open(AUDIO_CACHE);
  const m = await cache.match(rec.manifestUrl);
  if (!m) return null;
  const manifest = (await m.json()) as RenditionManifest;
  const info: RenditionInfo = {
    key: `audio/${rec.storyId}/${rec.locale}/${rec.voice}/${rec.renditionHash}`,
    storyId: rec.storyId,
    locale: rec.locale,
    lang: manifest.lang,
    voice: rec.voice,
    renditionHash: rec.renditionHash,
    contentHash: rec.contentHash,
    url: rec.audioUrl,
    manifestUrl: rec.manifestUrl,
    bytes: rec.bytes,
    durationMs: rec.durationMs,
    mimeType: "audio/mpeg",
    createdAt: new Date(rec.createdAt).toISOString(),
  };
  return { info, manifest, fromDownload: true };
}

export async function storageEstimate(): Promise<{ usage: number; quota: number; persisted: boolean }> {
  const est = (await navigator.storage?.estimate?.()) ?? { usage: 0, quota: 0 };
  const persisted = (await navigator.storage?.persisted?.()) ?? false;
  return { usage: est.usage ?? 0, quota: est.quota ?? 0, persisted };
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1_048_576).toFixed(1)} MB`;
}
