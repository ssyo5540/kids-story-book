import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getConfig, resetConfigForTests } from "@/lib/config";

const saved = { ...process.env };

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe("getConfig driver guard", () => {
  beforeEach(() => {
    resetConfigForTests();
    setEnv({
      GCS_BUCKET: "bucket",
      GCP_SA_KEY_JSON: undefined,
      ALLOW_FAKE_TTS_TO_GCS: undefined,
      ADMIN_TOKEN: undefined,
    });
  });
  afterEach(() => {
    resetConfigForTests();
    process.env = { ...saved };
  });

  it("refuses the fake TTS driver against real GCS storage", () => {
    setEnv({ STORAGE_DRIVER: "gcs", TTS_DRIVER: "fake" });
    expect(() => getConfig()).toThrow(/placeholder audio/);
  });

  it("allows fake TTS with local storage", () => {
    setEnv({ STORAGE_DRIVER: "local", TTS_DRIVER: "fake" });
    expect(getConfig().TTS_DRIVER).toBe("fake");
  });

  it("allows google TTS with GCS storage", () => {
    setEnv({ STORAGE_DRIVER: "gcs", TTS_DRIVER: "google" });
    expect(getConfig().STORAGE_DRIVER).toBe("gcs");
  });

  it("can be overridden explicitly", () => {
    setEnv({ STORAGE_DRIVER: "gcs", TTS_DRIVER: "fake", ALLOW_FAKE_TTS_TO_GCS: "true" });
    expect(getConfig().TTS_DRIVER).toBe("fake");
  });
});
