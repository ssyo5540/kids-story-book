import "./_env";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { CoverArt } from "@/components/catalog/CoverArt";
import { SleepyMoon } from "@/components/ui/SleepyMoon";
import { getConfig } from "@/lib/config";
import { DEFAULT_COVER } from "@/lib/content/catalog";
import { readContent } from "@/lib/content/loader";

/**
 * Generates the static audio/image assets the app ships with:
 *  - public/audio/silence-1s.mp3          (iOS "unlock" clip)
 *  - public/ambience/{rain,crickets,lullaby}-{1,2,3}.mp3   (30 s loops, three loudness levels, synthesised — no licensing)
 *  - public/covers/{symbol}-{accent}.png  (512×512 lock-screen artwork for every cover used in content)
 */
const SR = 24_000;
const LOOP_SECONDS = 30;
const LEVEL_GAIN = { 1: 0.35, 2: 0.6, 3: 1 } as const;

function run(bin: string, args: string[], stdin?: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: [stdin ? "pipe" : "ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr?.on("data", (d) => {
      err += d.toString();
    });
    p.on("error", reject);
    p.on("close", (c) => (c === 0 ? resolve() : reject(new Error(`${bin} ${args.slice(-1)[0]}: ${err.trim()}`))));
    if (stdin) p.stdin?.end(stdin);
  });
}

function toPcm(samples: Float32Array, gain = 1): Buffer {
  const buf = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++)
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * gain)) * 32767), i * 2);
  return buf;
}

/** Deterministic PRNG so loops are reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
}

function rain(): Float32Array {
  const n = SR * LOOP_SECONDS;
  const out = new Float32Array(n);
  const rand = rng(7);
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const white = rand() * 2;
    lp += 0.12 * (white - lp); // ~low-pass → pink-ish hiss
    lp2 += 0.02 * (lp - lp2);
    const t = i / SR;
    const swell = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.07 * t) * Math.sin(2 * Math.PI * 0.013 * t);
    // occasional drops
    const drop = rand() > 0.4985 ? (rand() + 0.5) * 0.35 : 0;
    out[i] = (lp * 0.9 - lp2 * 0.4 + drop) * swell * 0.5;
  }
  return out;
}

function crickets(): Float32Array {
  const n = SR * LOOP_SECONDS;
  const out = new Float32Array(n);
  const rand = rng(11);
  let wind = 0;
  const chirpers = [
    { f: 4200, rate: 21, phase: 0.0 },
    { f: 3800, rate: 17, phase: 0.4 },
    { f: 4600, rate: 24, phase: 0.75 },
  ];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    wind += 0.01 * (rand() * 2 - wind);
    let v = wind * 0.25;
    for (const c of chirpers) {
      // bursts of ~8 pulses every few seconds
      const cycle = (t / 3.1 + c.phase) % 1;
      const on = cycle < 0.42;
      if (!on) continue;
      const pulse = Math.max(0, Math.sin(2 * Math.PI * c.rate * t));
      const env = pulse ** 6;
      v += Math.sin(2 * Math.PI * c.f * t) * env * 0.12;
    }
    out[i] = v;
  }
  return out;
}

function lullaby(): Float32Array {
  const n = SR * LOOP_SECONDS;
  const out = new Float32Array(n);
  // Twinkle Twinkle, first two phrases, in C. 0 = rest.
  const C = 261.63;
  const D = 293.66;
  const E = 329.63;
  const F = 349.23;
  const G = 392.0;
  const A = 440.0;
  const melody = [C, C, G, G, A, A, G, 0, F, F, E, E, D, D, C, 0];
  const beat = 0.9;
  const phraseLen = melody.length * beat; // 14.4 s → loop holds two phrases + rests ≈ 30 s
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const tt = t % phraseLen;
    const idx = Math.floor(tt / beat);
    const note = melody[idx] ?? 0;
    let v = 0;
    if (note > 0) {
      const local = tt - idx * beat;
      const env = Math.exp(-local * 2.2) * Math.min(1, local * 60);
      v =
        (Math.sin(2 * Math.PI * note * t) +
          0.35 * Math.sin(2 * Math.PI * note * 2 * t) +
          0.12 * Math.sin(2 * Math.PI * note * 3 * t)) *
        env *
        0.35;
      // soft octave-below pad
      v += Math.sin(2 * Math.PI * (note / 2) * t) * Math.exp(-local * 1.2) * 0.08;
    }
    out[i] = v;
  }
  return out;
}

async function encode(pcm: Buffer, out: string, bitrate = 48) {
  await fs.mkdir(path.dirname(out), { recursive: true });
  await run(
    getConfig().FFMPEG_PATH,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "s16le",
      "-ar",
      String(SR),
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-c:a",
      "libmp3lame",
      "-b:a",
      `${bitrate}k`,
      out,
    ],
    pcm,
  );
}

async function main() {
  const cfg = getConfig();
  // 1. silence
  await fs.mkdir("public/audio", { recursive: true });
  await run(cfg.FFMPEG_PATH, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `anullsrc=r=${SR}:cl=mono`,
    "-t",
    "1",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "32k",
    "public/audio/silence-1s.mp3",
  ]);
  console.log("ok public/audio/silence-1s.mp3");

  // 2. ambience loops
  const tracks: Record<string, () => Float32Array> = { rain, crickets, lullaby };
  for (const [name, gen] of Object.entries(tracks)) {
    const samples = gen();
    for (const level of [1, 2, 3] as const) {
      const out = `public/ambience/${name}-${level}.mp3`;
      await encode(toPcm(samples, LEVEL_GAIN[level]), out);
      console.log(`ok ${out}`);
    }
  }

  // 3. cover PNGs (512×512, cover centred on the night background)
  const raw = await readContent(cfg.CONTENT_DIR);
  const covers = new Map<string, { symbol: string; accent: string }>();
  const add = (c?: { symbol?: string; accent: string }) => {
    const cover = c ?? DEFAULT_COVER;
    const symbol = cover.symbol ?? "moon";
    covers.set(`${symbol}-${cover.accent.replace("#", "").toLowerCase()}`, { symbol, accent: cover.accent });
  };
  add(DEFAULT_COVER);
  for (const c of raw.collections) add(c.cover);
  for (const s of raw.stories) add(s.meta.cover ?? raw.collections.find((c) => c.id === s.meta.collection)?.cover);
  await fs.mkdir("public/covers", { recursive: true });
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "covers-"));
  for (const [key, c] of covers) {
    const svg = renderToStaticMarkup(CoverArt({ symbol: c.symbol, accent: c.accent, title: key }));
    const cover = await sharp(Buffer.from(svg)).resize(384, 512).png().toBuffer();
    await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0b1030" } })
      .composite([{ input: cover, left: 64, top: 0 }])
      .png()
      .toFile(`public/covers/${key}.png`);
    console.log(`ok public/covers/${key}.png`);
  }
  await fs.rm(tmp, { recursive: true, force: true });

  // 4. PWA icons: moon on the night background (maskable keeps a safe margin)
  await fs.mkdir("public/icons", { recursive: true });
  const moonSvg = renderToStaticMarkup(SleepyMoon({}));
  const icon = async (size: number, pad: number, out: string) => {
    const inner = Math.round(size * (1 - pad * 2));
    const moon = await sharp(Buffer.from(moonSvg)).resize(inner, inner).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: "#0b1030" } })
      .composite([{ input: moon, left: Math.round(size * pad), top: Math.round(size * pad) }])
      .png()
      .toFile(out);
    console.log(`ok ${out}`);
  };
  await icon(192, 0.12, "public/icons/icon-192.png");
  await icon(512, 0.12, "public/icons/icon-512.png");
  await icon(512, 0.2, "public/icons/icon-maskable-512.png");
  await icon(180, 0.12, "app/apple-icon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
