import "./_env";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { encodePcmToMp3 } from "@/lib/audio/ffmpeg";
import { silence } from "@/lib/audio/pcm";
import { LOCALE_LANG, LOCALES } from "@/lib/content/types";
import { previewKey } from "@/lib/renditions/keys";
import { ensureRuntimeReady } from "@/lib/runtime";
import { IMMUTABLE_CACHE } from "@/lib/storage/types";
import { isLocale } from "@/lib/tts/voices";
import { fmtInt, usd } from "./_cli";

const { values } = parseArgs({
  options: {
    locale: { type: "string", multiple: true },
    "dry-run": { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    "verify-voices": { type: "boolean", default: false },
  },
});

async function main() {
  const rt = await ensureRuntimeReady();
  const voices = await rt.voices;
  const locales = values.locale?.length ? values.locale : [...LOCALES];
  for (const l of locales) if (!isLocale(l)) throw new Error(`unknown locale ${l}`);

  if (values["verify-voices"]) {
    if (!rt.tts.listVoices) console.log("verify-voices: driver has no listVoices (fake driver) — skipped");
    else
      for (const locale of locales) {
        if (!isLocale(locale)) continue;
        const available = await rt.tts.listVoices(locale);
        const missing = voices.chirpVoices
          .map((v) => `${locale}-Chirp3-HD-${v.name}`)
          .filter((id) => !available.includes(id));
        console.log(
          `${locale}: ${available.length} Chirp3-HD voices available${missing.length ? `; MISSING: ${missing.join(", ")}` : ""}`,
        );
      }
  }

  let total = 0;
  const todo: { locale: string; voice: string; text: string }[] = [];
  for (const locale of locales) {
    if (!isLocale(locale)) continue;
    const text = voices.previewText[LOCALE_LANG[locale]];
    for (const v of voices.chirpVoices) {
      const exists = !values.force && (await rt.storage.head(previewKey(locale, v.name)));
      if (exists) continue;
      todo.push({ locale, voice: v.name, text });
      total += [...text].length;
    }
  }
  console.log(`${todo.length} preview(s) to generate, ${fmtInt(total)} characters (≈ ${usd(total)})`);
  if (values["dry-run"] || todo.length === 0) return;

  const tmp = path.join(rt.cfg.TMPDIR ?? os.tmpdir(), "nightlight-previews");
  await fs.mkdir(tmp, { recursive: true });
  const reservation = rt.ledger.reserve(total);
  if (!reservation.ok) throw new Error(`budget refused: ${reservation.reason}`);
  for (const t of todo) {
    if (!isLocale(t.locale)) continue;
    await rt.limiter.acquire();
    const res = await rt.tts.synthesize({
      text: t.text,
      locale: t.locale,
      voiceName: t.voice,
      speakingRate: voices.locales[t.locale].speakingRate ?? rt.cfg.TTS_SPEAKING_RATE,
    });
    rt.ledger.commit(reservation.id, [...t.text].length, t.locale);
    const out = path.join(tmp, `${t.locale}-${t.voice}.mp3`);
    async function* parts() {
      yield silence(200);
      yield res.pcm;
      yield silence(400);
    }
    await encodePcmToMp3(parts(), {
      ffmpegPath: rt.cfg.FFMPEG_PATH,
      outPath: out,
      bitrateKbps: rt.cfg.AUDIO_MP3_BITRATE,
      normalize: rt.cfg.AUDIO_NORMALIZE,
      metadata: { title: `Preview ${t.voice}`, artist: t.voice, album: "Nightlight Tales" },
    });
    await rt.storage.putFile(out, previewKey(t.locale, t.voice), {
      contentType: "audio/mpeg",
      cacheControl: IMMUTABLE_CACHE,
    });
    console.log(`ok ${t.locale} ${t.voice} (${res.durationMs} ms)`);
  }
  rt.ledger.release(reservation.id);
  await rt.ledger.persist();
  await fs.rm(tmp, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
