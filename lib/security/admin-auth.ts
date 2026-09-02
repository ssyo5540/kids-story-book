import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import { getLimiters } from "./rate-limit";

/**
 * Bearer-token check for admin routes. Returns a Response to send when the request must be rejected.
 * While ADMIN_TOKEN is unset the routes answer 404, as if they did not exist.
 */
export function requireAdmin(req: NextRequest): Response | null {
  const token = getConfig().ADMIN_TOKEN;
  if (!token) return new Response("Not found", { status: 404 });
  const ipKey = `admin:${req.headers.get("x-forwarded-for") ?? "local"}`;
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(token);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    if (!getLimiters().perIp.hit(ipKey, 50)) return new Response("Too many attempts", { status: 429 });
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
