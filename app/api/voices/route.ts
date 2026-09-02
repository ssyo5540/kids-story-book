import { previewKey } from "@/lib/renditions/keys";
import { ensureRuntimeReady } from "@/lib/runtime";
import { toPublicVoices } from "@/lib/tts/voices";

export const dynamic = "force-dynamic";

export async function GET() {
  const rt = await ensureRuntimeReady();
  const voices = await rt.voices;
  const catalog = toPublicVoices(voices, (locale, voice) => rt.storage.publicUrl(previewKey(locale, voice)));
  return Response.json(catalog, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
