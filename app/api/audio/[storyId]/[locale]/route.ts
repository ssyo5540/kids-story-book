import type { NextRequest } from "next/server";
import { listReadyVoices } from "@/lib/renditions/service";
import { isLocale } from "@/lib/tts/voices";

export const dynamic = "force-dynamic";

/** Which voices already have audio for this story in this locale. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/audio/[storyId]/[locale]">) {
  const { storyId, locale } = await ctx.params;
  if (!isLocale(locale)) return Response.json({ error: "unknown locale" }, { status: 404 });
  const res = await listReadyVoices(storyId, locale);
  if (!res) return Response.json({ error: "unknown story" }, { status: 404 });
  return Response.json(res, { headers: { "Cache-Control": "no-store" } });
}
