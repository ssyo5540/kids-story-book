import { getPublicCatalog } from "@/lib/content/server";

// Rendered per request so the publishing gate (CONTENT_INCLUDE_UNREVIEWED) is a runtime decision.
export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getPublicCatalog();
  return Response.json(catalog, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
