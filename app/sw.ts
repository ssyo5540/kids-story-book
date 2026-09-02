/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  createPartialResponse,
  ExpirationPlugin,
  NetworkOnly,
  RangeRequestsPlugin,
  Serwist,
  StaleWhileRevalidate,
  Strategy,
  type StrategyHandler,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Must match lib/pwa/downloads.ts */
const AUDIO_CACHE = "story-audio-v1";

const isAudio = (url: URL) => url.pathname.includes("/audio/") && url.pathname.endsWith(".mp3");
const isPreview = (url: URL) => url.pathname.includes("/previews/") && url.pathname.endsWith(".mp3");
const isManifest = (url: URL) => url.pathname.includes("/audio/") && url.pathname.endsWith(".json");
const isAmbience = (url: URL) => url.origin === self.location.origin && url.pathname.startsWith("/ambience/");

/**
 * Serve downloaded story audio from the Cache API with proper 206 Range responses.
 * Streaming <audio> issues Range requests, which can never be cached as-is; only the download
 * manager populates this cache (with full 200 responses), so misses go straight to the network.
 */
class DownloadedAudioStrategy extends Strategy {
  async _handle(request: Request, handler: StrategyHandler): Promise<Response> {
    const cache = await caches.open(AUDIO_CACHE);
    const cached = await cache.match(request.url);
    if (cached) {
      return request.headers.has("range") ? createPartialResponse(request, cached) : cached;
    }
    return handler.fetch(request);
  }
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    { matcher: ({ url }) => url.pathname.startsWith("/api/"), handler: new NetworkOnly() },
    { matcher: ({ url }) => isAudio(url), handler: new DownloadedAudioStrategy() },
    {
      matcher: ({ url }) => isPreview(url),
      handler: new CacheFirst({
        cacheName: "voice-previews",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 3600 }), new RangeRequestsPlugin()],
      }),
    },
    {
      matcher: ({ url }) => isAmbience(url),
      handler: new CacheFirst({
        cacheName: "ambience",
        plugins: [new ExpirationPlugin({ maxEntries: 12 }), new RangeRequestsPlugin()],
      }),
    },
    {
      matcher: ({ url }) => isManifest(url),
      handler: new StaleWhileRevalidate({
        cacheName: "audio-manifests",
        plugins: [new ExpirationPlugin({ maxEntries: 200 })],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
