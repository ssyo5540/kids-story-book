import { Storage } from "@google-cloud/storage";
import { parseServiceAccount } from "@/lib/tts/google";
import { assertSafeKey, type HeadInfo, type PutOptions, type StorageAdapter } from "./types";

export class GcsStorage implements StorageAdapter {
  readonly name = "gcs" as const;
  private readonly bucket;
  private readonly baseUrl: string;

  constructor(opts: { bucket: string; saKeyJson?: string; projectId?: string; publicBaseUrl?: string }) {
    const credentials = parseServiceAccount(opts.saKeyJson);
    const storage = new Storage({
      ...(credentials ? { credentials: credentials as { client_email: string; private_key: string } } : {}),
      ...(opts.projectId ? { projectId: opts.projectId } : {}),
    });
    this.bucket = storage.bucket(opts.bucket);
    this.baseUrl = (opts.publicBaseUrl ?? `https://storage.googleapis.com/${opts.bucket}`).replace(/\/$/, "");
  }

  async put(key: string, body: Buffer, opts: PutOptions) {
    await this.bucket.file(assertSafeKey(key)).save(body, {
      contentType: opts.contentType,
      resumable: false,
      metadata: { cacheControl: opts.cacheControl, metadata: opts.metadata },
    });
  }

  async putFile(localPath: string, key: string, opts: PutOptions) {
    await this.bucket.upload(localPath, {
      destination: assertSafeKey(key),
      contentType: opts.contentType,
      metadata: { cacheControl: opts.cacheControl, metadata: opts.metadata },
    });
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    try {
      const [b] = await this.bucket.file(assertSafeKey(key)).download();
      return b;
    } catch (e) {
      if ((e as { code?: number }).code === 404) return null;
      throw e;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const b = await this.getBuffer(key);
    return b ? (JSON.parse(b.toString("utf8")) as T) : null;
  }

  async head(key: string): Promise<HeadInfo | null> {
    try {
      const [m] = await this.bucket.file(assertSafeKey(key)).getMetadata();
      return { size: Number(m.size ?? 0), contentType: m.contentType ?? undefined };
    } catch (e) {
      if ((e as { code?: number }).code === 404) return null;
      throw e;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const [files] = await this.bucket.getFiles({ prefix });
    return files.map((f) => f.name).sort();
  }

  async delete(key: string) {
    await this.bucket.file(assertSafeKey(key)).delete({ ignoreNotFound: true });
  }

  publicUrl(key: string) {
    return `${this.baseUrl}/${key}`;
  }
}
