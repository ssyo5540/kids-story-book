import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Logger } from "pino";
import { encodePcmToMp3, ffprobeDurationMs } from "@/lib/audio/ffmpeg";
import type { RenditionInfo, RenditionManifest } from "@/lib/audio/manifest";
import { silence } from "@/lib/audio/pcm";
import type { AppConfig } from "@/lib/config";
import { PIPELINE_VERSION } from "@/lib/content/hash";
import type { NarrationPlan } from "@/lib/narration/types";
import type { RenditionIndex } from "@/lib/renditions/index";
import { toInfo } from "@/lib/renditions/index";
import { renditionBaseKey } from "@/lib/renditions/keys";
import type { StorageAdapter } from "@/lib/storage/types";
import { IMMUTABLE_CACHE } from "@/lib/storage/types";
import type { BudgetLedger } from "@/lib/tts/budget";
import { pcmDurationMs, SAMPLE_RATE, type TtsDriver, TtsError } from "@/lib/tts/client";
import type { ProgressUpdater } from "./queue";
import type { RateLimiter } from "./rate-limiter";

export interface JobDeps {
  cfg: AppConfig;
  tts: TtsDriver;
  storage: StorageAdapter;
  ledger: BudgetLedger;
  limiter: RateLimiter;
  index: RenditionIndex;
  log: Logger;
}

export class BudgetExceededError extends Error {
  constructor(
    readonly reason: "monthly" | "daily",
    readonly retryAfter: string,
  ) {
    super(`character budget exceeded (${reason})`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  let failed: unknown = null;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length && !failed) {
      const i = next++;
      try {
        out[i] = await fn(items[i], i);
      } catch (e) {
        failed = e;
      }
    }
  });
  await Promise.all(workers);
  if (failed) throw failed;
  return out;
}

export function jobTmpDir(cfg: AppConfig, renditionHash: string): string {
  return path.join(cfg.TMPDIR ?? os.tmpdir(), "nightlight-jobs", renditionHash);
}

/** Synthesize all chunks → PCM files → one MP3 → upload MP3 then manifest (manifest last = completion marker). */
export async function runRenditionJob(
  plan: NarrationPlan,
  deps: JobDeps,
  update: ProgressUpdater,
): Promise<RenditionInfo> {
  const { cfg, tts, storage, ledger, limiter, index, log } = deps;
  const startedAt = Date.now();
  const baseKey = renditionBaseKey(plan.storyId, plan.locale, plan.voiceName, plan.renditionHash);

  const reservation = ledger.reserve(plan.totalChars);
  if (!reservation.ok) {
    update({ state: "budget_exceeded", retryAfter: reservation.retryAfter, error: `budget (${reservation.reason})` });
    throw new BudgetExceededError(reservation.reason, reservation.retryAfter);
  }

  const tmpDir = jobTmpDir(cfg, plan.renditionHash);
  await fs.mkdir(tmpDir, { recursive: true });
  let committed = 0;
  let done = 0;
  const latencies: number[] = [];

  const eta = () => {
    const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 2200;
    const remaining = plan.chunks.length - done;
    const synth = (remaining / Math.max(1, cfg.TTS_CONCURRENCY)) * avg;
    const encode = 2000 + plan.estimatedSeconds * 40;
    return Math.max(1, Math.round((synth + encode) / 1000));
  };
  const synthPercent = () => 1 + Math.round((done / plan.chunks.length) * 84);

  try {
    update({ state: "synthesizing", chunksDone: 0, chunksTotal: plan.chunks.length, percent: 1, etaSeconds: eta() });

    const chunkFiles = await mapWithConcurrency(plan.chunks, cfg.TTS_CONCURRENCY, async (chunk) => {
      const file = path.join(tmpDir, `chunk-${String(chunk.index).padStart(4, "0")}.pcm`);
      // Resume: reuse a chunk left behind by an interrupted run of the same hash (already billed).
      try {
        const st = await fs.stat(file);
        if (st.size > 0) {
          done++;
          update({ chunksDone: done, percent: synthPercent(), etaSeconds: eta() });
          return { file, bytes: st.size };
        }
      } catch {
        /* not present */
      }
      let attempt = 0;
      for (;;) {
        await limiter.acquire();
        const t0 = Date.now();
        try {
          const res = await tts.synthesize({
            text: chunk.text,
            locale: plan.locale,
            voiceName: plan.voiceName,
            speakingRate: plan.speakingRate,
            ipa: chunk.ipa,
          });
          latencies.push(Date.now() - t0);
          // Write-then-rename so a kill mid-write can never leave a truncated chunk for a later resume to trust.
          await fs.writeFile(`${file}.tmp`, res.pcm);
          await fs.rename(`${file}.tmp`, file);
          ledger.commit(reservation.id, chunk.chars, plan.locale);
          committed += chunk.chars;
          done++;
          update({ chunksDone: done, percent: synthPercent(), etaSeconds: eta() });
          return { file, bytes: res.pcm.length };
        } catch (e) {
          const err = e as TtsError | Error;
          const retryable = err instanceof TtsError ? err.retryable : false;
          if (err instanceof TtsError && err.code === 8) limiter.pause(30_000);
          if (!retryable || attempt >= 5) {
            log.error(
              { chunk: chunk.index, err: err.message, text: chunk.text.slice(0, 80) },
              "chunk synthesis failed",
            );
            throw err;
          }
          const backoff = 1000 * 2 ** attempt + Math.random() * 500;
          log.warn({ chunk: chunk.index, attempt, backoff, err: err.message }, "retrying chunk");
          attempt++;
          await sleep(backoff);
        }
      }
    });

    update({
      state: "encoding",
      percent: 86,
      etaSeconds: Math.max(1, Math.round((2000 + plan.estimatedSeconds * 40) / 1000)),
    });

    const timings: RenditionManifest["chunks"] = [];
    let cursor = plan.leadInMs;
    async function* parts(): AsyncIterable<Buffer> {
      yield silence(plan.leadInMs);
      for (let i = 0; i < plan.chunks.length; i++) {
        const chunk = plan.chunks[i];
        const pcm = await fs.readFile(chunkFiles[i].file);
        const dur = pcmDurationMs(pcm.length);
        timings.push({
          index: chunk.index,
          paragraphIndex: chunk.paragraphIndex,
          startMs: Math.round(cursor),
          endMs: Math.round(cursor + dur),
          chars: chunk.chars,
        });
        cursor += dur;
        yield pcm;
        if (chunk.pauseAfterMs > 0) {
          yield silence(chunk.pauseAfterMs);
          cursor += chunk.pauseAfterMs;
        }
      }
      yield silence(plan.tailMs);
      cursor += plan.tailMs;
    }

    const outPath = path.join(tmpDir, "out.mp3");
    await encodePcmToMp3(parts(), {
      ffmpegPath: cfg.FFMPEG_PATH,
      outPath,
      bitrateKbps: cfg.AUDIO_MP3_BITRATE,
      normalize: cfg.AUDIO_NORMALIZE,
      metadata: { title: plan.title, artist: plan.voiceName, album: plan.collectionTitle },
    });
    const durationMs = await ffprobeDurationMs(cfg.FFPROBE_PATH, outPath);
    const bytes = (await fs.stat(outPath)).size;

    update({ state: "uploading", percent: 95, etaSeconds: 2 });
    const url = storage.publicUrl(`${baseKey}.mp3`);
    const manifestUrl = storage.publicUrl(`${baseKey}.json`);
    await storage.putFile(outPath, `${baseKey}.mp3`, { contentType: "audio/mpeg", cacheControl: IMMUTABLE_CACHE });

    const paragraphs: RenditionManifest["paragraphs"] = plan.paragraphs
      .filter((p) => p.firstChunkIndex >= 0)
      .map((p) => ({
        index: p.index,
        sectionIndex: p.sectionIndex,
        kind: p.kind,
        startMs: timings[p.firstChunkIndex].startMs,
        endMs: timings[p.lastChunkIndex].endMs,
      }));
    const sections = plan.sections.map((s) => ({
      index: s.index,
      title: s.title,
      startMs: timings[Math.max(0, s.firstChunkIndex)]?.startMs ?? 0,
    }));

    const manifest: RenditionManifest = {
      key: baseKey,
      storyId: plan.storyId,
      locale: plan.locale,
      lang: plan.lang,
      voice: plan.voiceName,
      renditionHash: plan.renditionHash,
      contentHash: plan.contentHash,
      url,
      manifestUrl,
      bytes,
      durationMs,
      mimeType: "audio/mpeg",
      createdAt: new Date().toISOString(),
      pipelineVersion: PIPELINE_VERSION,
      speakingRate: plan.speakingRate,
      sampleRate: SAMPLE_RATE,
      bitrateKbps: cfg.AUDIO_MP3_BITRATE,
      leadInMs: plan.leadInMs,
      sections,
      paragraphs,
      chunks: timings,
    };
    await storage.put(`${baseKey}.json`, Buffer.from(JSON.stringify(manifest)), {
      contentType: "application/json",
      cacheControl: IMMUTABLE_CACHE,
    });

    const info = toInfo(manifest);
    index.add(info);
    ledger.release(reservation.id, { completedRendition: true });
    update({ state: "ready", percent: 100, etaSeconds: 0, result: info });
    log.info(
      { key: baseKey, chars: plan.totalChars, durationMs, bytes, ms: Date.now() - startedAt },
      "rendition ready",
    );
    await fs.rm(tmpDir, { recursive: true, force: true });
    return info;
  } catch (e) {
    // Chunk PCMs stay on disk so a retry of the same hash can resume without paying again.
    ledger.release(reservation.id, { interruptedChars: committed });
    throw e;
  }
}
