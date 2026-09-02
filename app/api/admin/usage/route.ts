import type { NextRequest } from "next/server";
import { ensureRuntimeReady } from "@/lib/runtime";
import { requireAdmin } from "@/lib/security/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const rt = await ensureRuntimeReady();
  await rt.ledger.refreshOthers(true);
  const snap = rt.ledger.snapshot();
  const all = rt.index.all();
  const byLocale: Record<string, number> = {};
  for (const r of all) byLocale[r.locale] = (byLocale[r.locale] ?? 0) + 1;
  return Response.json(
    {
      month: snap.month,
      charsUsed: snap.used,
      charsUsedToday: snap.usedToday,
      charsReserved: snap.reserved,
      budget: snap.monthlyBudget,
      dailyBudget: snap.dailyBudget,
      remaining: snap.remaining,
      pctUsed: snap.monthlyBudget ? Math.round((snap.used / snap.monthlyBudget) * 1000) / 10 : 0,
      writers: snap.writers,
      renditions: { total: all.length, byLocale },
      jobs: rt.queue.list().map((j) => ({ jobId: j.jobId, state: j.state, percent: j.percent })),
      driver: rt.tts.name,
      storage: rt.storage.name,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
