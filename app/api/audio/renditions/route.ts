import type { NextRequest } from "next/server";
import { z } from "zod";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { ensureRendition } from "@/lib/renditions/service";
import { clientKey, getLimiters, isSameOrigin } from "@/lib/security/rate-limit";
import { isLocale } from "@/lib/tts/voices";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  storyId: z.string().regex(/^[a-z0-9-]{3,64}$/),
  locale: z.string().refine(isLocale, "unknown locale"),
  voice: z.string().regex(/^(default|[A-Z][a-z]{1,20})$/),
});

/** Ensure a rendition exists: 200 ready | 202 generating | 200 unavailable (with a friendly reason). */
export async function POST(req: NextRequest) {
  const cfg = getConfig();
  if (!isSameOrigin(req, cfg.NEXT_PUBLIC_APP_URL)) return Response.json({ error: "forbidden" }, { status: 403 });
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 1024) return Response.json({ error: "payload too large" }, { status: 413 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }
  if (!isLocale(body.locale)) return Response.json({ error: "unknown locale" }, { status: 404 });

  const limiters = getLimiters();
  const ipKey = clientKey(req);
  const perIpOk = limiters.perIp.hit(ipKey, cfg.PUBLIC_GENERATION_PER_IP_PER_DAY);
  const globalOk = perIpOk && limiters.global.hit("all", cfg.PUBLIC_GENERATION_GLOBAL_PER_DAY);
  const mayGenerate = perIpOk && globalOk;
  if (perIpOk && !globalOk) limiters.perIp.refund(ipKey);

  const result = await ensureRendition(body.storyId, body.locale, body.voice, {
    source: mayGenerate ? "public" : "admin",
  });
  // A request that did not start a job should not consume the caller's daily allowance.
  if (mayGenerate && result.status !== "generating") {
    limiters.perIp.refund(ipKey);
    limiters.global.refund("all");
  }
  if (!mayGenerate && result.status === "generating") {
    // limiter said no but a job for this rendition is already running for someone else: fine to attach
  } else if (!mayGenerate && result.status !== "ready") {
    return Response.json(
      {
        status: "unavailable",
        reason: "disabled",
        message: "That is enough new voices for today. Try again tomorrow, or listen in the default voice.",
        fallback: "fallback" in result ? result.fallback : undefined,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (result.status === "unavailable" && result.reason === "unknown_story")
    return Response.json({ error: "unknown story" }, { status: 404 });
  logger.debug(
    { storyId: body.storyId, locale: body.locale, voice: body.voice, status: result.status },
    "rendition request",
  );
  return Response.json(result, {
    status: result.status === "generating" ? 202 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
