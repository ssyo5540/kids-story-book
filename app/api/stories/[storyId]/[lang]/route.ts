import type { NextRequest } from "next/server";
import { findStory } from "@/lib/content/server";
import { LANGS, type Lang } from "@/lib/content/types";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/stories/[storyId]/[lang]">) {
  const { storyId, lang } = await ctx.params;
  if (!(LANGS as readonly string[]).includes(lang))
    return Response.json({ error: "unknown language" }, { status: 404 });
  const found = await findStory(storyId);
  const text = found?.story.texts[lang as Lang];
  if (!text) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(
    {
      storyId,
      lang,
      title: text.title,
      contentHash: text.contentHash,
      reviewStatus: text.reviewStatus,
      paragraphs: text.paragraphs,
    },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
