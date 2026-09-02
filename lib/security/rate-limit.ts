import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  day: string;
}

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
      this.buckets.set(key, { count: 1, day });
      if (this.buckets.size > 10_000) for (const [k, v] of this.buckets) if (v.day !== day) this.buckets.delete(k);
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
}

type G = typeof globalThis & { __nightlightLimiters?: { perIp: DailyLimiter; global: DailyLimiter } };

export function getLimiters() {
  const g = globalThis as G;
  if (!g.__nightlightLimiters) g.__nightlightLimiters = { perIp: new DailyLimiter(), global: new DailyLimiter() };
  return g.__nightlightLimiters;
}

/** Client IP from proxy headers, hashed with a daily salt so it is never stored or logged raw. */
export function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip")) ?? "unknown";
  const salt = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${salt}|${ip.trim()}`).digest("hex").slice(0, 16);
}

/** Cheap CSRF-ish check: browsers send Sec-Fetch-Site; require same-origin (or a matching Origin header). */
export function isSameOrigin(req: NextRequest, appUrl: string): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl) have neither header
  try {
    return new URL(origin).host === new URL(appUrl).host || new URL(origin).host === req.nextUrl.host;
  } catch {
    return false;
  }
}
