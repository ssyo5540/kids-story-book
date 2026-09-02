import { BYTES_PER_MS } from "@/lib/tts/client";

/** Digital silence for 16-bit mono PCM at the pipeline sample rate. */
export function silence(ms: number): Buffer {
  const bytes = Math.max(0, Math.round(ms * BYTES_PER_MS));
  return Buffer.alloc(bytes - (bytes % 2));
}

export function pcmMs(bytes: number): number {
  return bytes / BYTES_PER_MS;
}
