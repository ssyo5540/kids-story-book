import type { RenditionInfo } from "@/lib/audio/manifest";
import type { Locale } from "@/lib/content/types";

export type JobState = "queued" | "synthesizing" | "encoding" | "uploading" | "ready" | "failed" | "budget_exceeded";

export interface JobProgress {
  jobId: string;
  storyId: string;
  locale: Locale;
  voice: string;
  state: JobState;
  chunksDone: number;
  chunksTotal: number;
  /** 0-100 */
  percent: number;
  etaSeconds: number;
  startedAt: string;
  updatedAt: string;
  error?: string;
  retryAfter?: string;
  result?: RenditionInfo;
}

export const TERMINAL_STATES: ReadonlySet<JobState> = new Set(["ready", "failed", "budget_exceeded"]);
