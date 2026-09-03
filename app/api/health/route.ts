import type { NextRequest } from "next/server";
import { assertFfmpegAvailable } from "@/lib/audio/ffmpeg";
import { getConfig } from "@/lib/config";
import { ensureRuntimeReady } from "@/lib/runtime";
import { requireAdmin } from "@/lib/security/admin-auth";

export const dynamic = "force-dynamic";

const started = Date.now();
const FFMPEG_RECHECK_MS = 10 * 60_000;
let ffmpegCheck: { at: number; result: Promise<{ ok: boolean; detail: string }> } | null = null;

/** Probing ffmpeg spawns two processes; the binary does not change at runtime, so cache the answer. */
function checkFfmpeg() {
  const now = Date.now();
  if (!ffmpegCheck || now - ffmpegCheck.at > FFMPEG_RECHECK_MS) {
    const cfg = getConfig();
    ffmpegCheck = {
      at: now,
      result: assertFfmpegAvailable(cfg.FFMPEG_PATH, cfg.FFPROBE_PATH)
        .then((v) => ({ ok: true, detail: v.ffmpeg.split(" ").slice(0, 3).join(" ") }))
        .catch((e) => ({ ok: false, detail: `missing: ${(e as Error).message}` })),
    };
  }
  return ffmpegCheck.result;
}

/**
 * Liveness for Railway and the uptime monitor. The public shape is deliberately boring: booleans
 * plus the deployed commit. Drivers, budget and queue detail are included only for admin callers.
 */
export async function GET(req: NextRequest) {
  const ffmpeg = await checkFfmpeg();
  let runtimeOk = true;
  let detail: Record<string, unknown> | null = null;
  const isAdmin = requireAdmin(req) === null;
  try {
    const rt = await ensureRuntimeReady();
    if (isAdmin) {
      const snap = rt.ledger.snapshot();
      detail = {
        ffmpeg: ffmpeg.detail,
        storage: rt.storage.name,
        tts: rt.tts.name,
        renditions: rt.index.all().length,
        jobs: rt.queue.stats,
        budget: { month: snap.month, used: snap.used, usedToday: snap.usedToday, limit: snap.monthlyBudget },
      };
    }
  } catch (e) {
    runtimeOk = false;
    if (isAdmin) detail = { runtimeError: (e as Error).message };
  }
  const ok = ffmpeg.ok && runtimeOk;
  return Response.json(
    {
      ok,
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      uptimeSec: Math.round((Date.now() - started) / 1000),
      checks: { ffmpeg: ffmpeg.ok, runtime: runtimeOk },
      ...(detail ? { detail } : {}),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
