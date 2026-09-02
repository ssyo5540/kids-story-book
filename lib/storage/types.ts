export interface PutOptions {
  contentType: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface HeadInfo {
  size: number;
  contentType?: string;
}

export interface StorageAdapter {
  readonly name: "local" | "gcs" | "memory";
  put(key: string, body: Buffer, opts: PutOptions): Promise<void>;
  putFile(localPath: string, key: string, opts: PutOptions): Promise<void>;
  getBuffer(key: string): Promise<Buffer | null>;
  getJson<T>(key: string): Promise<T | null>;
  head(key: string): Promise<HeadInfo | null>;
  /** Recursive listing of keys under a prefix. */
  list(prefix: string): Promise<string[]>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
export const SHORT_CACHE = "public, max-age=300";

function hasControlChars(s: string): boolean {
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

export function assertSafeKey(key: string): string {
  if (!key || key.startsWith("/") || key.includes("..") || key.includes("\\") || hasControlChars(key)) {
    throw new Error(`unsafe storage key: ${key}`);
  }
  return key;
}
