import { getConfig } from "@/lib/config";
import { LocalStorage } from "./local";
import type { StorageAdapter } from "./types";

export async function createStorage(): Promise<StorageAdapter> {
  const cfg = getConfig();
  if (cfg.STORAGE_DRIVER === "gcs") {
    if (!cfg.GCS_BUCKET) throw new Error("GCS_BUCKET is required when STORAGE_DRIVER=gcs");
    const { GcsStorage } = await import("./gcs");
    return new GcsStorage({
      bucket: cfg.GCS_BUCKET,
      saKeyJson: cfg.GCP_SA_KEY_JSON,
      projectId: cfg.GCP_PROJECT_ID,
      publicBaseUrl: cfg.PUBLIC_AUDIO_BASE_URL,
    });
  }
  return new LocalStorage(cfg.LOCAL_STORAGE_DIR);
}
