import { spawn } from "node:child_process";
import { SAMPLE_RATE } from "@/lib/tts/client";

export interface EncodeOptions {
  ffmpegPath: string;
  outPath: string;
  bitrateKbps: number;
  normalize: boolean;
  metadata: { title: string; artist: string; album: string };
}

export async function assertFfmpegAvailable(
  ffmpegPath: string,
  ffprobePath: string,
): Promise<{ ffmpeg: string; ffprobe: string }> {
  const version = (bin: string) =>
    new Promise<string>((resolve, reject) => {
      const p = spawn(bin, ["-version"]);
      let out = "";
      p.stdout.on("data", (d) => {
        out += d.toString();
      });
      p.on("error", (e) => reject(new Error(`${bin} not found: ${e.message}`)));
      p.on("close", (code) => (code === 0 ? resolve(out.split("\n")[0]) : reject(new Error(`${bin} exited ${code}`))));
    });
  return { ffmpeg: await version(ffmpegPath), ffprobe: await version(ffprobePath) };
}

/**
 * Stream raw 16-bit mono PCM parts into ffmpeg and write one MP3 (CBR, LAME Info tag → exact duration
 * and byte-accurate seeking in browsers).
 */
export function encodePcmToMp3(parts: AsyncIterable<Buffer>, opts: EncodeOptions): Promise<void> {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-f",
    "s16le",
    "-ar",
    String(SAMPLE_RATE),
    "-ac",
    "1",
    "-i",
    "pipe:0",
  ];
  if (opts.normalize) args.push("-af", "loudnorm=I=-18:TP=-1.5:LRA=11");
  args.push(
    "-c:a",
    "libmp3lame",
    "-b:a",
    `${opts.bitrateKbps}k`,
    "-ar",
    String(SAMPLE_RATE),
    "-ac",
    "1",
    "-id3v2_version",
    "3",
    "-metadata",
    `title=${opts.metadata.title}`,
    "-metadata",
    `artist=${opts.metadata.artist}`,
    "-metadata",
    `album=${opts.metadata.album}`,
    opts.outPath,
  );

  return new Promise<void>((resolve, reject) => {
    const p = spawn(opts.ffmpegPath, args, { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    p.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.trim()}`))));

    (async () => {
      try {
        for await (const part of parts) {
          if (part.length === 0) continue;
          if (!p.stdin.write(part)) await new Promise<void>((r) => p.stdin.once("drain", () => r()));
        }
        p.stdin.end();
      } catch (e) {
        p.stdin.destroy();
        p.kill("SIGKILL");
        reject(e);
      }
    })();
  });
}

export function ffprobeDurationMs(ffprobePath: string, file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffprobePath, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
    let out = "";
    p.stdout.on("data", (d) => {
      out += d.toString();
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exited ${code}`));
      const seconds = Number.parseFloat(out.trim());
      if (Number.isFinite(seconds)) resolve(Math.round(seconds * 1000));
      else reject(new Error(`ffprobe returned "${out.trim()}"`));
    });
  });
}
