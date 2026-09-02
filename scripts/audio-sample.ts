import "./_env";
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { encodePcmToMp3 } from "@/lib/audio/ffmpeg";
import { silence } from "@/lib/audio/pcm";
import { buildPlan } from "@/lib/renditions/plan";
import { ensureRuntimeReady } from "@/lib/runtime";
import { isLocale, resolveVoiceName } from "@/lib/tts/voices";
import { collectionTitle, fmtInt, loadCliCatalog, usd } from "./_cli";

const { values } = parseArgs({
  options: {
    story: { type: "string" },
    locale: { type: "string" },
    voice: { type: "string", default: "default" },
    paragraphs: { type: "string", default: "0-2" },
    out: { type: "string" },
  },
});

async function main() {
  if (!values.story || !values.locale || !isLocale(values.locale))
    throw new Error("usage: audio:sample --story <id> --locale <xx-YY> [--voice Name] [--paragraphs 0-2]");
  const rt = await ensureRuntimeReady();
  const voices = await rt.voices;
  const catalog = await loadCliCatalog(true);
  const story = catalog.stories.find((s) => s.meta.id === values.story);
  if (!story) throw new Error(`story ${values.story} not found`);
  const voiceName = resolveVoiceName(voices, values.locale, values.voice);
  const plan = await buildPlan(story, collectionTitle(catalog, story), values.locale, voiceName, voices);
  const [a, b] = values.paragraphs.split("-").map(Number);
  const lo = Number.isFinite(a) ? a : 0;
  const hi = Number.isFinite(b) ? b : lo;
  const chunks = plan.chunks.filter((c) => c.paragraphIndex >= lo && c.paragraphIndex <= hi);
  const chars = chunks.reduce((n, c) => n + c.chars, 0);
  console.log(
    `${chunks.length} chunk(s), ${fmtInt(chars)} chars (≈ ${usd(chars)}) — paragraphs ${lo}-${hi} of ${story.meta.id} in ${values.locale} / ${voiceName}`,
  );
  const reservation = rt.ledger.reserve(chars);
  if (!reservation.ok) throw new Error(`budget refused: ${reservation.reason}`);
  const pcms: Buffer[] = [];
  for (const c of chunks) {
    await rt.limiter.acquire();
    const res = await rt.tts.synthesize({
      text: c.text,
      locale: values.locale,
      voiceName,
      speakingRate: plan.speakingRate,
      ipa: c.ipa,
    });
    rt.ledger.commit(reservation.id, c.chars, values.locale);
    pcms.push(res.pcm, silence(c.pauseAfterMs || 700));
  }
  rt.ledger.release(reservation.id);
  const out =
    values.out ?? path.join(".data", "samples", `${story.meta.id}-${values.locale}-${voiceName}-${lo}-${hi}.mp3`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  async function* parts() {
    yield silence(300);
    for (const p of pcms) yield p;
  }
  await encodePcmToMp3(parts(), {
    ffmpegPath: rt.cfg.FFMPEG_PATH,
    outPath: out,
    bitrateKbps: rt.cfg.AUDIO_MP3_BITRATE,
    normalize: rt.cfg.AUDIO_NORMALIZE,
    metadata: { title: `Sample ${story.meta.id}`, artist: voiceName, album: "Nightlight Tales samples" },
  });
  await rt.ledger.persist();
  console.log(`wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
