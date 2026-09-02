import { getPublicCatalog } from "@/lib/content/server";

export const dynamic = "force-static";

export async function GET() {
  const catalog = await getPublicCatalog();
  return Response.json(catalog, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
