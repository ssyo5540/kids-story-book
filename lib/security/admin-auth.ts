import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import { clientKey, getLimiters } from "./rate-limit";

/** Failed attempts allowed per client per day, and across all clients (the token is >= 32 random chars). */
const PER_CLIENT_FAILURES = 50;
const GLOBAL_FAILURES = 500;

/**
 * Bearer-token check for admin routes. Returns a Response to send when the request must be rejected.
 * While ADMIN_TOKEN is unset the routes answer 404, as if they did not exist.
 */
export function requireAdmin(req: NextRequest): Response | null {
  const token = getConfig().ADMIN_TOKEN;
  if (!token) return new Response("Not found", { status: 404 });
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(token);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (ok) return null;
  const limiters = getLimiters();
  const clientOk = limiters.perIp.hit(`admin:${clientKey(req)}`, PER_CLIENT_FAILURES);
  const globalOk = limiters.global.hit("admin-failures", GLOBAL_FAILURES);
  if (!clientOk || !globalOk) return new Response("Too many attempts", { status: 429 });
  return new Response("Unauthorized", { status: 401 });
}
