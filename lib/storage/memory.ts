import type { HeadInfo, PutOptions, StorageAdapter } from "./types";

/** In-memory storage for unit tests. */
export class MemoryStorage implements StorageAdapter {
  readonly name = "memory" as const;
  readonly objects = new Map<string, { body: Buffer; opts: PutOptions }>();

  async put(key: string, body: Buffer, opts: PutOptions) {
    this.objects.set(key, { body: Buffer.from(body), opts });
  }
  async putFile(localPath: string, key: string, opts: PutOptions) {
    const { readFile } = await import("node:fs/promises");
    this.objects.set(key, { body: await readFile(localPath), opts });
  }
  async getBuffer(key: string) {
    return this.objects.get(key)?.body ?? null;
  }
  async getJson<T>(key: string) {
    const b = await this.getBuffer(key);
    return b ? (JSON.parse(b.toString("utf8")) as T) : null;
  }
  async head(key: string): Promise<HeadInfo | null> {
    const o = this.objects.get(key);
    return o ? { size: o.body.length, contentType: o.opts.contentType } : null;
  }
  async list(prefix: string) {
    return [...this.objects.keys()].filter((k) => k.startsWith(prefix)).sort();
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
  publicUrl(key: string) {
    return `memory://${key}`;
  }
}
