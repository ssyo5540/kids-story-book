import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Logger } from "pino";
import { type AppConfig, getConfig } from "@/lib/config";
import type { VoicesFile } from "@/lib/content/schema";
import { JobQueue } from "@/lib/jobs/queue";
import { RateLimiter } from "@/lib/jobs/rate-limiter";
import { logger } from "@/lib/logger";
import { RenditionIndex } from "@/lib/renditions/index";
import { createStorage } from "@/lib/storage";
import type { StorageAdapter } from "@/lib/storage/types";
import { BudgetLedger } from "@/lib/tts/budget";
import type { TtsDriver } from "@/lib/tts/client";
import { createTtsDriver } from "@/lib/tts/driver";
import { loadVoices } from "@/lib/tts/voices";

export interface Runtime {
  cfg: AppConfig;
  log: Logger;
  storage: StorageAdapter;
  tts: TtsDriver;
  voices: Promise<VoicesFile>;
  ledger: BudgetLedger;
  limiter: RateLimiter;
  queue: JobQueue;
  index: RenditionIndex;
}

type G = typeof globalThis & { __nightlightRuntime?: Promise<Runtime> };

/** Remove job temp dirs older than a day (interrupted runs). */
async function purgeStaleTmp(cfg: AppConfig, log: Logger) {
  const root = path.join(cfg.TMPDIR ?? os.tmpdir(), "nightlight-jobs");
  try {
    const entries = await fs.readdir(root);
    const cutoff = Date.now() - 24 * 3600_000;
    for (const e of entries) {
      const p = path.join(root, e);
      const st = await fs.stat(p);
      if (st.mtimeMs < cutoff) await fs.rm(p, { recursive: true, force: true });
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") log.warn({ err: (e as Error).message }, "tmp purge failed");
  }
}

async function build(): Promise<Runtime> {
  const cfg = getConfig();
  const log = logger.child({ mod: "runtime" });
  const storage = await createStorage();
  const tts = await createTtsDriver();
  const ledger = new BudgetLedger(storage, cfg.TTS_WRITER_ID, cfg.TTS_MONTHLY_CHAR_BUDGET, cfg.TTS_DAILY_CHAR_BUDGET);
  const index = new RenditionIndex(storage);
  const rt: Runtime = {
    cfg,
    log,
    storage,
    tts,
    voices: loadVoices(cfg.CONTENT_DIR),
    ledger,
    limiter: new RateLimiter(cfg.TTS_MAX_RPM),
    queue: new JobQueue(cfg.JOBS_CONCURRENCY),
    index,
  };
  await Promise.all([ledger.load(), index.warm(), rt.voices, purgeStaleTmp(cfg, log)]);
  log.info(
    { storage: storage.name, tts: tts.name, renditions: index.all().length, budget: ledger.snapshot() },
    "runtime ready",
  );
  return rt;
}

/** Process-wide singletons (storage, TTS driver, ledger, queue, index), built once and reused across requests. */
export function ensureRuntimeReady(): Promise<Runtime> {
  const g = globalThis as G;
  if (!g.__nightlightRuntime) {
    g.__nightlightRuntime = build().catch((e) => {
      g.__nightlightRuntime = undefined;
      throw e;
    });
  }
  return g.__nightlightRuntime;
}

export function resetRuntimeForTests() {
  (globalThis as G).__nightlightRuntime = undefined;
}
