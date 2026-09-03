import type { NextRequest } from "next/server";
import { z } from "zod";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { ensureRendition } from "@/lib/renditions/service";
import { clientKey, getLimiters, isSameOrigin, readJsonCapped } from "@/lib/security/rate-limit";
import { isLocale } from "@/lib/tts/voices";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;

const bodySchema = z.object({
  storyId: z.string().regex(/^[a-z0-9-]{3,64}$/),
  locale: z.string().refine(isLocale, "unknown locale"),
  voice: z.string().regex(/^(default|[A-Z][a-z]{1,20})$/),
});

const NO_STORE = { "Cache-Control": "no-store" };

/** Ensure a rendition exists: 200 ready | 202 generating | 200 unavailable (with a friendly reason). */
export async function POST(req: NextRequest) {
  const cfg = getConfig();
  if (!isSameOrigin(req, cfg.NEXT_PUBLIC_APP_URL)) return Response.json({ error: "forbidden" }, { status: 403 });

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await readJsonCapped(req, MAX_BODY_BYTES);
    if (raw === "too-large") return Response.json({ error: "payload too large" }, { status: 413 });
    body = bodySchema.parse(raw);
  } catch {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
  if (!isLocale(body.locale)) return Response.json({ error: "unknown locale" }, { status: 404 });

  // Count a *potential* new job against the caller before anything can start; refund if nothing started.
  const limiters = getLimiters();
  const ipKey = clientKey(req);
  const perIpOk = limiters.perIp.hit(ipKey, cfg.PUBLIC_GENERATION_PER_IP_PER_DAY);
  const globalOk = perIpOk && limiters.global.hit("all", cfg.PUBLIC_GENERATION_GLOBAL_PER_DAY);
  const mayGenerate = perIpOk && globalOk;
  if (perIpOk && !globalOk) limiters.perIp.refund(ipKey);

  // When the limiter says no, the service may still answer "ready" (cached) or attach to a job that is
  // already running for someone else, but it must never start a new one.
  const result = await ensureRendition(body.storyId, body.locale, body.voice, {
    source: "public",
    noGenerate: !mayGenerate,
  });
  if (mayGenerate && result.status !== "generating") {
    limiters.perIp.refund(ipKey);
    limiters.global.refund("all");
  }
  if (result.status === "unavailable" && result.reason === "unknown_story")
    return Response.json({ error: "unknown story" }, { status: 404 });
  if (!mayGenerate && result.status === "unavailable" && result.reason === "rate_limited") {
    return Response.json(
      {
        status: "unavailable",
        reason: "disabled",
        message: "That is enough new voices for today. Try again tomorrow, or listen in the default voice.",
        fallback: result.fallback,
      },
      { status: 200, headers: NO_STORE },
    );
  }
  logger.debug(
    { storyId: body.storyId, locale: body.locale, voice: body.voice, status: result.status },
    "rendition request",
  );
  return Response.json(result, { status: result.status === "generating" ? 202 : 200, headers: NO_STORE });
}
