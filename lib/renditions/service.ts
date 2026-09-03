import type { RenditionInfo } from "@/lib/audio/manifest";
import { getCatalog } from "@/lib/content/loader";
import { type Catalog, LOCALE_LANG, type Locale, type Story } from "@/lib/content/types";
import type { JobProgress } from "@/lib/jobs/progress";
import { BudgetExceededError, runRenditionJob } from "@/lib/jobs/rendition-job";
import { PlanError } from "@/lib/narration/prepare";
import { ensureRuntimeReady, type Runtime } from "@/lib/runtime";
import { resolveVoiceName } from "@/lib/tts/voices";
import { jobIdFor } from "./keys";
import { buildPlan } from "./plan";

export type EnsureSource = "public" | "cli" | "admin";

export interface EnsureOptions {
  source: EnsureSource;
  /** Answer from cache or attach to a running job, but never start a new one (caller is rate-limited). */
  noGenerate?: boolean;
}

export type EnsureResult =
  | { status: "ready"; rendition: RenditionInfo }
  | { status: "generating"; job: JobProgress; fallback?: RenditionInfo }
  | {
      status: "unavailable";
      reason: "budget" | "disabled" | "failed" | "unpublished" | "unknown_voice" | "unknown_story" | "rate_limited";
      message: string;
      retryAfter?: string;
      fallback?: RenditionInfo;
    };

type Plan = Awaited<ReturnType<typeof buildPlan>>;
const PLAN_CACHE_MAX = 1000;
const planCache = new Map<string, Promise<Plan>>();

/**
 * Narration plans are pure functions of (text content, locale, voice, pipeline settings); building one
 * normalises and chunks the whole story, so memoise by content hash instead of redoing it per page view.
 */
function cachedPlan(
  story: Story,
  collectionTitle: string,
  locale: Locale,
  voiceName: string,
  voices: Awaited<Runtime["voices"]>,
): Promise<Plan> {
  const text = story.texts[LOCALE_LANG[locale]];
  if (!text) return buildPlan(story, collectionTitle, locale, voiceName, voices); // throws PlanError consistently
  const key = `${story.meta.id}|${locale}|${voiceName}|${text.contentHash}`;
  let p = planCache.get(key);
  if (!p) {
    if (planCache.size >= PLAN_CACHE_MAX) planCache.clear();
    p = buildPlan(story, collectionTitle, locale, voiceName, voices);
    p.catch(() => planCache.delete(key));
    planCache.set(key, p);
  }
  return p;
}

function collectionTitleOf(catalog: Pick<Catalog, "collections">, story: Story): string {
  return catalog.collections.find((c) => c.id === story.meta.collection)?.title.en ?? story.meta.collection;
}

/** Which voices already have audio for this story + locale (with the current text hash). */
export async function listReadyVoices(
  storyId: string,
  locale: Locale,
): Promise<{ default: string; ready: string[] } | null> {
  const rt = await ensureRuntimeReady();
  const voices = await rt.voices;
  const catalog = await getCatalog();
  const story = catalog.stories.find((s) => s.meta.id === storyId);
  if (!story) return null;
  const lv = voices.locales[locale];
  const ready: string[] = [];
  for (const v of voices.chirpVoices) {
    try {
      const plan = await cachedPlan(story, collectionTitleOf(catalog, story), locale, v.name, voices);
      if (await rt.index.get(storyId, locale, v.name, plan.renditionHash)) ready.push(v.name);
    } catch (e) {
      if (e instanceof PlanError) break; // no text in this language at all
      throw e;
    }
  }
  return { default: lv.default, ready };
}

/** Ensure a rendition exists for a published story (server path). */
export async function ensureRendition(
  storyId: string,
  locale: Locale,
  voice: string,
  opts: EnsureOptions,
): Promise<EnsureResult> {
  const catalog = await getCatalog();
  const story = catalog.stories.find((s) => s.meta.id === storyId);
  if (!story) return { status: "unavailable", reason: "unknown_story", message: "We could not find that story." };
  return ensureRenditionForStory(story, collectionTitleOf(catalog, story), locale, voice, opts);
}

/** Same, for a story object the caller already validated (CLI with --allow-unreviewed). */
export async function ensureRenditionForStory(
  story: Story,
  collectionTitle: string,
  locale: Locale,
  voice: string,
  opts: EnsureOptions,
): Promise<EnsureResult> {
  const rt = await ensureRuntimeReady();
  const voices = await rt.voices;
  let voiceName: string;
  try {
    voiceName = resolveVoiceName(voices, locale, voice);
  } catch {
    return {
      status: "unavailable",
      reason: "unknown_voice",
      message: "That voice is not available for this language.",
    };
  }

  let plan: Awaited<ReturnType<typeof buildPlan>>;
  try {
    plan = await cachedPlan(story, collectionTitle, locale, voiceName, voices);
  } catch (e) {
    if (e instanceof PlanError)
      return {
        status: "unavailable",
        reason: "unpublished",
        message: "This story is not available in that language yet.",
      };
    throw e;
  }

  const existing = await rt.index.get(story.meta.id, locale, voiceName, plan.renditionHash);
  if (existing) return { status: "ready", rendition: existing };

  const fallback = await fallbackRendition(story, collectionTitle, locale, voiceName);

  const jobId = jobIdFor(story.meta.id, locale, voiceName, plan.renditionHash);
  const running = rt.queue.get(jobId);
  if (running && rt.queue.has(jobId)) return { status: "generating", job: running, fallback };

  if (opts.noGenerate) {
    return {
      status: "unavailable",
      reason: "rate_limited",
      message: "That is enough new voices for today. Try again tomorrow, or listen in the default voice.",
      fallback,
    };
  }
  if (!rt.queue.isAccepting) {
    return {
      status: "unavailable",
      reason: "disabled",
      message: "We are just restarting. Please try again in a moment.",
      fallback,
    };
  }
  const cfg = rt.cfg;
  if (!cfg.TTS_ENABLED || (opts.source === "public" && !cfg.TTS_LAZY_ENABLED)) {
    return {
      status: "unavailable",
      reason: "disabled",
      message: "New voices are resting tonight. Try the default voice.",
      fallback,
    };
  }
  await rt.ledger.refreshOthers();
  const snap = rt.ledger.snapshot();
  const overMonth = snap.remaining < plan.totalChars;
  const overDay = snap.dailyBudget > 0 && snap.remainingToday < plan.totalChars;
  if (overMonth || overDay) {
    const r = rt.ledger.reserve(plan.totalChars); // returns the precise retryAfter without reserving
    return {
      status: "unavailable",
      reason: "budget",
      message: "This voice is resting for now. Shall we hear it in the default voice instead?",
      retryAfter: r.ok ? undefined : r.retryAfter,
      fallback,
    };
  }

  const now = new Date().toISOString();
  const initial: JobProgress = {
    jobId,
    storyId: story.meta.id,
    locale,
    voice: voiceName,
    state: "queued",
    chunksDone: 0,
    chunksTotal: plan.chunks.length,
    percent: 0,
    etaSeconds: Math.round(plan.chunks.length * 2.2 + 2),
    startedAt: now,
    updatedAt: now,
  };
  const { progress, promise } = rt.queue.enqueue(initial, (update) =>
    runRenditionJob(
      plan,
      {
        cfg,
        tts: rt.tts,
        storage: rt.storage,
        ledger: rt.ledger,
        limiter: rt.limiter,
        index: rt.index,
        log: rt.log.child({ jobId }),
      },
      update,
    ),
  );
  promise.catch((e) => {
    if (!(e instanceof BudgetExceededError)) rt.log.error({ jobId, err: (e as Error).message }, "rendition job failed");
  });
  return { status: "generating", job: progress, fallback };
}

async function fallbackRendition(
  story: Story,
  collectionTitle: string,
  locale: Locale,
  exceptVoice: string,
): Promise<RenditionInfo | undefined> {
  const rt = await ensureRuntimeReady();
  const voices = await rt.voices;
  const def = voices.locales[locale].default;
  if (def === exceptVoice) return undefined;
  try {
    const plan = await cachedPlan(story, collectionTitle, locale, def, voices);
    return (await rt.index.get(story.meta.id, locale, def, plan.renditionHash)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function getJob(jobId: string): Promise<JobProgress | undefined> {
  const rt = await ensureRuntimeReady();
  return rt.queue.get(jobId);
}
