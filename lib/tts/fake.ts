import { LOCALE_LANG } from "@/lib/content/types";
import { estimateSeconds } from "@/lib/narration/estimate";
import { BYTES_PER_MS, SAMPLE_RATE, type SynthesizeRequest, type SynthesizeResult, type TtsDriver } from "./client";

/**
 * Zero-cost driver: produces a soft, speech-like hum for the estimated duration so the whole
 * pipeline and UI can be exercised without credentials. Sounds intentionally synthetic.
 */
export class FakeTtsDriver implements TtsDriver {
  readonly name = "fake" as const;
  readonly sampleRate = SAMPLE_RATE;
  constructor(private readonly latencyMs = 120) {}

  async synthesize(req: SynthesizeRequest): Promise<SynthesizeResult> {
    if (req.signal?.aborted) throw new Error("aborted");
    await new Promise((r) => setTimeout(r, this.latencyMs));
    const seconds = Math.max(0.4, estimateSeconds([...req.text].length, LOCALE_LANG[req.locale], req.speakingRate));
    const samples = Math.round(seconds * SAMPLE_RATE);
    const pcm = Buffer.alloc(samples * 2);
    // pseudo "syllables": amplitude envelope with ~4 Hz rhythm, base tone 180 Hz + gentle vibrato
    const wordsPerSec = 3.6;
    for (let i = 0; i < samples; i++) {
      const t = i / SAMPLE_RATE;
      const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * wordsPerSec * t);
      const gate = Math.sin(2 * Math.PI * (wordsPerSec / 2) * t) > -0.3 ? 1 : 0.15;
      const freq = 180 + 20 * Math.sin(2 * Math.PI * 0.7 * t);
      const v = Math.sin(2 * Math.PI * freq * t) * env * gate * 0.12;
      pcm.writeInt16LE(Math.round(v * 32767), i * 2);
    }
    return { pcm, sampleRate: SAMPLE_RATE, durationMs: Math.round(pcm.length / BYTES_PER_MS) };
  }
}
