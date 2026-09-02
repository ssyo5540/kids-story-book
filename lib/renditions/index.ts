import type { RenditionInfo, RenditionManifest } from "@/lib/audio/manifest";
import type { Locale } from "@/lib/content/types";
import type { StorageAdapter } from "@/lib/storage/types";
import { parseManifestKey, renditionBaseKey } from "./keys";

/**
 * In-memory index of completed renditions, keyed by base key. Warmed from storage at boot;
 * misses probe storage (so renditions produced by the laptop CLI are discovered without a DB).
 */
export class RenditionIndex {
  private byKey = new Map<string, RenditionInfo>();
  private negative = new Map<string, number>();
  private warmed = false;

  constructor(private readonly storage: StorageAdapter) {}

  async warm(): Promise<number> {
    const keys = await this.storage.list("audio/");
    let n = 0;
    await Promise.all(
      keys
        .filter((k) => k.endsWith(".json") && parseManifestKey(k))
        .map(async (k) => {
          const m = await this.storage.getJson<RenditionManifest>(k);
          if (m) {
            this.byKey.set(m.key, toInfo(m));
            n++;
          }
        }),
    );
    this.warmed = true;
    return n;
  }

  get isWarm() {
    return this.warmed;
  }

  add(info: RenditionInfo) {
    this.byKey.set(info.key, info);
    this.negative.delete(info.key);
  }

  peek(key: string): RenditionInfo | undefined {
    return this.byKey.get(key);
  }

  async get(storyId: string, locale: Locale, voice: string, renditionHash: string): Promise<RenditionInfo | null> {
    const key = renditionBaseKey(storyId, locale, voice, renditionHash);
    const hit = this.byKey.get(key);
    if (hit) return hit;
    const neg = this.negative.get(key);
    if (neg && Date.now() - neg < 30_000) return null;
    const m = await this.storage.getJson<RenditionManifest>(`${key}.json`);
    if (m) {
      const info = toInfo(m);
      this.byKey.set(key, info);
      return info;
    }
    this.negative.set(key, Date.now());
    return null;
  }

  all(): RenditionInfo[] {
    return [...this.byKey.values()];
  }

  remove(key: string) {
    this.byKey.delete(key);
  }
}

export function toInfo(m: RenditionManifest): RenditionInfo {
  return {
    key: m.key,
    storyId: m.storyId,
    locale: m.locale,
    lang: m.lang,
    voice: m.voice,
    renditionHash: m.renditionHash,
    contentHash: m.contentHash,
    url: m.url,
    manifestUrl: m.manifestUrl,
    bytes: m.bytes,
    durationMs: m.durationMs,
    mimeType: m.mimeType,
    createdAt: m.createdAt,
  };
}
