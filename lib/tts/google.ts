import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import type { Locale } from "@/lib/content/types";
import {
  pcmDurationMs,
  SAMPLE_RATE,
  type SynthesizeRequest,
  type SynthesizeResult,
  type TtsDriver,
  TtsError,
} from "./client";
import { voiceId } from "./voices";

export function parseServiceAccount(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const json = trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf8");
  return JSON.parse(json) as Record<string, unknown>;
}

const RETRYABLE = new Set([4, 8, 13, 14]); // DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED, INTERNAL, UNAVAILABLE

/** Chirp 3 HD via the Cloud Text-to-Speech v1 API. Returns raw PCM (WAV header stripped). */
export class GoogleTtsDriver implements TtsDriver {
  readonly name = "google" as const;
  readonly sampleRate = SAMPLE_RATE;
  private readonly client: TextToSpeechClient;

  constructor(opts: { saKeyJson?: string; projectId?: string }) {
    const credentials = parseServiceAccount(opts.saKeyJson);
    this.client = new TextToSpeechClient({
      ...(credentials ? { credentials: credentials as { client_email: string; private_key: string } } : {}),
      ...(opts.projectId ? { projectId: opts.projectId } : {}),
    });
  }

  async synthesize(req: SynthesizeRequest): Promise<SynthesizeResult> {
    try {
      const [res] = await this.client.synthesizeSpeech(
        {
          input: {
            text: req.text,
            ...(req.ipa?.length
              ? {
                  customPronunciations: {
                    pronunciations: req.ipa.map((p) => ({
                      phrase: p.phrase,
                      phoneticEncoding: "PHONETIC_ENCODING_IPA" as const,
                      pronunciation: p.ipa,
                    })),
                  },
                }
              : {}),
          },
          voice: { languageCode: req.locale, name: voiceId(req.locale, req.voiceName) },
          audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: SAMPLE_RATE, speakingRate: req.speakingRate },
        },
        { timeout: 60_000 },
      );
      const content = res.audioContent;
      if (!content) throw new TtsError("empty audioContent", 13, true);
      let buf = typeof content === "string" ? Buffer.from(content, "base64") : Buffer.from(content);
      if (buf.length >= 44 && buf.subarray(0, 4).toString("ascii") === "RIFF") buf = buf.subarray(44);
      return { pcm: buf, sampleRate: SAMPLE_RATE, durationMs: pcmDurationMs(buf.length) };
    } catch (e) {
      if (e instanceof TtsError) throw e;
      const code = typeof (e as { code?: unknown }).code === "number" ? ((e as { code: number }).code as number) : 2;
      throw new TtsError((e as Error).message, code, RETRYABLE.has(code));
    }
  }

  async listVoices(locale: Locale): Promise<string[]> {
    const [res] = await this.client.listVoices({ languageCode: locale });
    return (res.voices ?? []).map((v) => v.name ?? "").filter((n) => n.includes("Chirp3-HD"));
  }
}
