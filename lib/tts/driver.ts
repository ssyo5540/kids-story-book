import { getConfig } from "@/lib/config";
import type { TtsDriver } from "./client";
import { FakeTtsDriver } from "./fake";

export async function createTtsDriver(): Promise<TtsDriver> {
  const cfg = getConfig();
  if (cfg.TTS_DRIVER === "fake") return new FakeTtsDriver();
  const { GoogleTtsDriver } = await import("./google");
  return new GoogleTtsDriver({ saKeyJson: cfg.GCP_SA_KEY_JSON, projectId: cfg.GCP_PROJECT_ID });
}
