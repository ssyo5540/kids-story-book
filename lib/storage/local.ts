import { promises as fs } from "node:fs";
import path from "node:path";
import { assertSafeKey, type HeadInfo, type PutOptions, type StorageAdapter } from "./types";

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".json": "application/json",
  ".wav": "audio/wav",
};

export function contentTypeFor(key: string): string {
  return CONTENT_TYPES[path.extname(key)] ?? "application/octet-stream";
}

/** Filesystem storage for development (served with Range support by app/blob/[...path]). */
export class LocalStorage implements StorageAdapter {
  readonly name = "local" as const;
  constructor(readonly root: string) {}

  resolve(key: string): string {
    assertSafeKey(key);
    return path.join(this.root, key);
  }

  async put(key: string, body: Buffer, _opts: PutOptions): Promise<void> {
    const p = this.resolve(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.tmp`;
    await fs.writeFile(tmp, body);
    await fs.rename(tmp, p);
  }

  async putFile(localPath: string, key: string, _opts: PutOptions): Promise<void> {
    const p = this.resolve(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.copyFile(localPath, p);
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const b = await this.getBuffer(key);
    return b ? (JSON.parse(b.toString("utf8")) as T) : null;
  }

  async head(key: string): Promise<HeadInfo | null> {
    try {
      const st = await fs.stat(this.resolve(key));
      return st.isFile() ? { size: st.size, contentType: contentTypeFor(key) } : null;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const out: string[] = [];
    const base = this.resolve(prefix.replace(/\/$/, "") || ".");
    const walk = async (dir: string) => {
      let entries: import("node:fs").Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
        throw e;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else if (e.isFile() && !e.name.endsWith(".tmp"))
          out.push(path.relative(this.root, full).split(path.sep).join("/"));
      }
    };
    await walk(base);
    return out.filter((k) => k.startsWith(prefix)).sort();
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }

  publicUrl(key: string): string {
    return `/blob/${key}`;
  }
}
