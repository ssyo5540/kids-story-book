import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import { contentTypeFor, LocalStorage } from "@/lib/storage/local";
import { IMMUTABLE_CACHE, SHORT_CACHE } from "@/lib/storage/types";

/** Serves LOCAL_STORAGE_DIR files with HTTP Range support. Only active when STORAGE_DRIVER=local. */
export async function GET(req: NextRequest, ctx: RouteContext<"/blob/[...path]">) {
  const cfg = getConfig();
  if (cfg.STORAGE_DRIVER !== "local") return new Response("Not found", { status: 404 });
  const { path: segments } = await ctx.params;
  const key = segments.join("/");
  let file: string;
  try {
    file = new LocalStorage(cfg.LOCAL_STORAGE_DIR).resolve(key);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  let st: Awaited<ReturnType<typeof fs.stat>>;
  try {
    st = await fs.stat(file);
    if (!st.isFile()) throw new Error("not a file");
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const size = st.size;
  const type = contentTypeFor(key);
  const cache = key.startsWith("audio/") ? IMMUTABLE_CACHE : SHORT_CACHE;
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": cache,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
  };

  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m) return new Response("Bad range", { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    let start = m[1] ? Number(m[1]) : 0;
    let end = m[2] ? Number(m[2]) : size - 1;
    if (!m[1] && m[2]) {
      start = Math.max(0, size - Number(m[2]));
      end = size - 1;
    }
    if (start >= size || end < start)
      return new Response("Range not satisfiable", { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    end = Math.min(end, size - 1);
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
}
