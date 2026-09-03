import type { RenditionInfo, RenditionManifest } from "@/lib/audio/manifest";
import type { Locale } from "@/lib/content/types";
import { type JobProgress, TERMINAL_STATES } from "@/lib/jobs/progress";
import type { EnsureResult } from "@/lib/renditions/service";

export interface RenditionRef {
  storyId: string;
  locale: Locale;
  voice: string;
}

export type UnavailableReason =
  | "budget"
  | "disabled"
  | "failed"
  | "unpublished"
  | "unknown_voice"
  | "unknown_story"
  | "rate_limited"
  | "network";

export class RenditionUnavailableError extends Error {
  constructor(
    readonly reason: UnavailableReason,
    message: string,
    readonly fallback?: RenditionInfo,
    readonly retryAfter?: string,
  ) {
    super(message);
  }
}

export interface ResolvedRendition {
  info: RenditionInfo;
  manifest: RenditionManifest;
  fromDownload: boolean;
}

export interface ResolveOptions {
  signal?: AbortSignal;
  onProgress?: (job: JobProgress, fallback?: RenditionInfo) => void;
  /** Look up a locally downloaded copy first. */
  lookupDownload?: (ref: RenditionRef) => Promise<ResolvedRendition | null>;
}

/** Turn an HTTP failure into copy a tired parent can act on; the status code stays in the console only. */
function describeStatus(status: number): { reason: UnavailableReason; message: string } {
  if (status === 403)
    return { reason: "failed", message: "This page could not talk to the story server. Please reload and try again." };
  if (status === 404) return { reason: "unknown_story", message: "We could not find that story." };
  if (status === 429)
    return {
      reason: "disabled",
      message: "That is enough new voices for today. Try again tomorrow, or listen in the default voice.",
    };
  if (status >= 500)
    return { reason: "failed", message: "The story server is having a moment. Please try again shortly." };
  return { reason: "network", message: "Something went wrong while asking for this voice." };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok && res.status !== 202) {
    const d = describeStatus(res.status);
    console.warn(`[renditions] request failed (${res.status})`);
    throw new RenditionUnavailableError(d.reason, d.message);
  }
  return (await res.json()) as T;
}

/** Give up on a stalled job after this long; the longest story generates in well under this. */
const POLL_DEADLINE_MS = 15 * 60_000;
/** A job id that keeps vanishing means the server keeps restarting; stop re-requesting after a few tries. */
const MAX_JOB_RESTARTS = 3;

export async function fetchReadyVoices(
  storyId: string,
  locale: Locale,
  signal?: AbortSignal,
): Promise<{ default: string; ready: string[] }> {
  const res = await fetch(`/api/audio/${encodeURIComponent(storyId)}/${locale}`, { signal, cache: "no-store" });
  return json(res);
}

export async function requestRendition(ref: RenditionRef, signal?: AbortSignal): Promise<EnsureResult> {
  const res = await fetch("/api/audio/renditions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ref),
    signal,
    cache: "no-store",
  });
  if (res.status === 404) throw new RenditionUnavailableError("unknown_story", "We could not find that story.");
  return json(res);
}

export async function fetchJob(jobId: string, signal?: AbortSignal): Promise<JobProgress | null> {
  const res = await fetch(`/api/audio/jobs/${encodeURIComponent(jobId)}`, { signal, cache: "no-store" });
  if (res.status === 404) return null;
  return json(res);
}

export async function fetchManifest(url: string, signal?: AbortSignal): Promise<RenditionManifest> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new RenditionUnavailableError("network", `manifest failed (${res.status})`);
  return (await res.json()) as RenditionManifest;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      },
      { once: true },
    );
  });

function pollInterval(elapsedMs: number): number {
  if (elapsedMs < 30_000) return 1500;
  if (elapsedMs < 120_000) return 2500;
  return 4000;
}

/** Resolve (or lazily generate) the audio for a story/locale/voice, reporting progress along the way. */
export async function resolveRendition(ref: RenditionRef, opts: ResolveOptions = {}): Promise<ResolvedRendition> {
  const { signal } = opts;
  const local = await opts.lookupDownload?.(ref);
  if (local) return local;

  const first = await requestRendition(ref, signal);
  if (first.status === "ready")
    return {
      info: first.rendition,
      manifest: await fetchManifest(first.rendition.manifestUrl, signal),
      fromDownload: false,
    };
  if (first.status === "unavailable")
    throw new RenditionUnavailableError(first.reason, first.message, first.fallback, first.retryAfter);

  const fallback = first.fallback;
  let job = first.job;
  opts.onProgress?.(job, fallback);
  const t0 = Date.now();
  let restarts = 0;
  while (!TERMINAL_STATES.has(job.state)) {
    if (Date.now() - t0 > POLL_DEADLINE_MS)
      throw new RenditionUnavailableError(
        "failed",
        "This voice is taking far too long tonight. Try the default voice.",
        fallback,
      );
    // Keep polling while the tab is hidden (screen locked mid-"Preparing"), just less often.
    const hidden = typeof document !== "undefined" && document.hidden;
    await sleep(Math.max(pollInterval(Date.now() - t0), hidden ? 5000 : 0), signal);
    const next = await fetchJob(job.jobId, signal);
    if (!next) {
      // job expired from the registry (server restart); ask again — it is either ready now or restarts
      if (++restarts > MAX_JOB_RESTARTS)
        throw new RenditionUnavailableError(
          "failed",
          "The story server keeps restarting. Please try again in a few minutes.",
          fallback,
        );
      const again = await requestRendition(ref, signal);
      if (again.status === "ready")
        return {
          info: again.rendition,
          manifest: await fetchManifest(again.rendition.manifestUrl, signal),
          fromDownload: false,
        };
      if (again.status === "unavailable")
        throw new RenditionUnavailableError(again.reason, again.message, again.fallback, again.retryAfter);
      job = again.job;
    } else job = next;
    opts.onProgress?.(job, fallback);
  }
  if (job.state === "ready" && job.result)
    return { info: job.result, manifest: await fetchManifest(job.result.manifestUrl, signal), fromDownload: false };
  if (job.state === "budget_exceeded")
    throw new RenditionUnavailableError("budget", "This voice is resting for now.", fallback, job.retryAfter);
  throw new RenditionUnavailableError("failed", job.error ?? "Something went wrong preparing this voice.", fallback);
}

/** Play a known rendition (e.g. the default-voice fallback) without going through the job flow. */
export async function resolveKnown(info: RenditionInfo, signal?: AbortSignal): Promise<ResolvedRendition> {
  return { info, manifest: await fetchManifest(info.manifestUrl, signal), fromDownload: false };
}
