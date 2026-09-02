import type { Locale } from "@/lib/content/types";
import type { IpaEntry } from "@/lib/narration/types";

export interface SynthesizeRequest {
  text: string;
  locale: Locale;
  voiceName: string;
  speakingRate: number;
  ipa?: IpaEntry[];
  signal?: AbortSignal;
}

export interface SynthesizeResult {
  /** Raw 16-bit little-endian mono PCM at `sampleRate` (no WAV header). */
  pcm: Buffer;
  sampleRate: number;
  durationMs: number;
}

export interface TtsDriver {
  readonly name: "google" | "fake";
  readonly sampleRate: number;
  synthesize(req: SynthesizeRequest): Promise<SynthesizeResult>;
  listVoices?(locale: Locale): Promise<string[]>;
}

/** Error with a gRPC-like numeric code so retry logic can branch on it. */
export class TtsError extends Error {
  constructor(
    message: string,
    readonly code: number,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export const SAMPLE_RATE = 24_000;
export const BYTES_PER_MS = (SAMPLE_RATE * 2) / 1000; // 48 bytes per ms for 16-bit mono

export function pcmDurationMs(bytes: number): number {
  return Math.round(bytes / BYTES_PER_MS);
}
