import type { NextRequest } from "next/server";
import { JOB_ID_RE } from "@/lib/renditions/keys";
import { getJob } from "@/lib/renditions/service";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/audio/jobs/[jobId]">) {
  const { jobId } = await ctx.params;
  if (!JOB_ID_RE.test(jobId)) return Response.json({ error: "bad job id" }, { status: 400 });
  const job = await getJob(jobId);
  if (!job)
    return Response.json(
      { error: "unknown job (it may have finished a while ago; request the rendition again)" },
      { status: 404 },
    );
  return Response.json(job, { headers: { "Cache-Control": "no-store" } });
}
