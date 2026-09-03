import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  day: string;
}

/** Hard cap on tracked keys; the oldest entries are evicted first (Map keeps insertion order). */
const MAX_BUCKETS = 10_000;

/** Fixed-window per-day counters kept in memory (single instance). */
export class DailyLimiter {
  private buckets = new Map<string, Bucket>();
  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
  /** Returns true when the request is allowed and counts it. */
  hit(key: string, limit: number): boolean {
    if (limit <= 0) return false;
    const day = this.today();
    const b = this.buckets.get(key);
    if (!b || b.day !== day) {
      this.buckets.delete(key);
      this.buckets.set(key, { count: 1, day });
      this.evict(day);
      return true;
    }
    if (b.count >= limit) return false;
    b.count++;
    return true;
  }
  /** Undo a hit (e.g. the request turned out to be a no-op). */
  refund(key: string) {
    const b = this.buckets.get(key);
    if (b && b.count > 0) b.count--;
  }
  get size() {
    return this.buckets.size;
  }
  private evict(day: string) {
    if (this.buckets.size <= MAX_BUCKETS) return;
    for (const [k, v] of this.buckets) if (v.day !== day) this.buckets.delete(k);
    // Still over the cap (an attacker rotating keys within one day): drop the oldest entries.
    let excess = this.buckets.size - MAX_BUCKETS;
    for (const k of this.buckets.keys()) {
      if (excess-- <= 0) break;
      this.buckets.delete(k);
    }
  }
}

type G = typeof globalThis & { __nightlightLimiters?: { perIp: DailyLimiter; global: DailyLimiter } };

export function getLimiters() {
  const g = globalThis as G;
  if (!g.__nightlightLimiters) g.__nightlightLimiters = { perIp: new DailyLimiter(), global: new DailyLimiter() };
  return g.__nightlightLimiters;
}

/**
 * Best-effort client IP. Reverse proxies (Railway included) *append* the connecting address to
 * X-Forwarded-For, so the rightmost entry is the one set by our own edge; anything to its left is
 * client-supplied and spoofable.
 */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Client IP hashed with a daily salt so it is never stored or logged raw. */
export function clientKey(req: NextRequest): string {
  const salt = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${salt}|${clientIp(req.headers)}`)
    .digest("hex")
    .slice(0, 16);
}

/** Cheap CSRF-ish check: browsers send Sec-Fetch-Site; require same-origin (or a matching Origin header). */
export function isSameOrigin(req: NextRequest, appUrl: string): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl) have neither header
  try {
    return new URL(origin).host === new URL(appUrl).host;
  } catch {
    return false;
  }
}

/**
 * Read a JSON body without trusting Content-Length: chunked uploads have none, and App Router
 * handlers impose no default cap. Returns "too-large" once more than `maxBytes` have arrived.
 */
export async function readJsonCapped(req: Request, maxBytes: number): Promise<unknown | "too-large"> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return "too-large";
  if (!req.body) return JSON.parse("");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return "too-large";
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
