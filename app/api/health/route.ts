import { assertFfmpegAvailable } from "@/lib/audio/ffmpeg";
import { getConfig } from "@/lib/config";
import { ensureRuntimeReady } from "@/lib/runtime";

export const dynamic = "force-dynamic";

const started = Date.now();

export async function GET() {
  const cfg = getConfig();
  const checks: Record<string, unknown> = {};
  let ok = true;
  try {
    const v = await assertFfmpegAvailable(cfg.FFMPEG_PATH, cfg.FFPROBE_PATH);
    checks.ffmpeg = v.ffmpeg.split(" ").slice(0, 3).join(" ");
  } catch (e) {
    ok = false;
    checks.ffmpeg = `missing: ${(e as Error).message}`;
  }
  try {
    const rt = await ensureRuntimeReady();
    const snap = rt.ledger.snapshot();
    checks.storage = rt.storage.name;
    checks.tts = rt.tts.name;
    checks.renditions = rt.index.all().length;
    checks.jobs = rt.queue.stats;
    checks.budget = { month: snap.month, used: snap.used, limit: snap.monthlyBudget };
  } catch (e) {
    ok = false;
    checks.runtime = `error: ${(e as Error).message}`;
  }
  return Response.json(
    {
      ok,
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      uptimeSec: Math.round((Date.now() - started) / 1000),
      ...checks,
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
