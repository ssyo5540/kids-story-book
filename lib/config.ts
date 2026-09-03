import { z } from "zod";

/**
 * Server-side configuration, validated once from process.env.
 * Never import this from client components (it reads secrets).
 */
const bool = z.enum(["true", "false", "1", "0", ""]).transform((v) => v === "true" || v === "1");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  ADMIN_TOKEN: z.string().optional(),

  CONTENT_DIR: z.string().default("content"),
  CONTENT_INCLUDE_UNREVIEWED: bool.default(false),

  STORAGE_DRIVER: z.enum(["local", "gcs"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default(".data/storage"),
  GCS_BUCKET: z.string().optional(),
  PUBLIC_AUDIO_BASE_URL: z.string().optional(),
  GCP_PROJECT_ID: z.string().optional(),
  GCP_SA_KEY_JSON: z.string().optional(),

  TTS_DRIVER: z.enum(["google", "fake"]).default("fake"),
  /** Escape hatch for the fake-driver-into-real-bucket guard; never set this on Railway. */
  ALLOW_FAKE_TTS_TO_GCS: bool.default(false),
  TTS_ENABLED: bool.default(true),
  TTS_LAZY_ENABLED: bool.default(true),
  TTS_MONTHLY_CHAR_BUDGET: z.coerce.number().int().nonnegative().default(900_000),
  TTS_DAILY_CHAR_BUDGET: z.coerce.number().int().nonnegative().default(150_000),
  TTS_WRITER_ID: z.string().default("server"),
  TTS_MAX_RPM: z.coerce.number().int().positive().default(100),
  TTS_CONCURRENCY: z.coerce.number().int().positive().default(3),
  JOBS_CONCURRENCY: z.coerce.number().int().positive().default(2),
  TTS_SPEAKING_RATE: z.coerce.number().min(0.25).max(2).default(0.9),
  TTS_MAX_CHUNK_BYTES: z.coerce.number().int().min(500).max(4900).default(4500),
  TTS_MAX_CHUNK_EST_SECONDS: z.coerce.number().int().positive().default(60),
  TTS_CUSTOM_PRONUNCIATION_LOCALES: z.string().default("en-US,en-GB,en-IN"),
  PUBLIC_GENERATION_PER_IP_PER_DAY: z.coerce.number().int().nonnegative().default(3),
  PUBLIC_GENERATION_GLOBAL_PER_DAY: z.coerce.number().int().nonnegative().default(20),

  AUDIO_MP3_BITRATE: z.coerce.number().int().min(32).max(128).default(56),
  AUDIO_NORMALIZE: bool.default(true),
  TMPDIR: z.string().optional(),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
});

export type AppConfig = z.infer<typeof schema> & {
  customPronunciationLocales: string[];
  isProd: boolean;
};

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const cfg = parsed.data;
  const isProd = cfg.NODE_ENV === "production";

  if (isProd && cfg.STORAGE_DRIVER === "gcs" && (!cfg.GCS_BUCKET || !cfg.GCP_SA_KEY_JSON)) {
    throw new Error("STORAGE_DRIVER=gcs requires GCS_BUCKET and GCP_SA_KEY_JSON in production");
  }
  if (isProd && cfg.TTS_DRIVER === "google" && !cfg.GCP_SA_KEY_JSON) {
    throw new Error("TTS_DRIVER=google requires GCP_SA_KEY_JSON in production");
  }
  if (cfg.STORAGE_DRIVER === "gcs" && cfg.TTS_DRIVER === "fake" && !cfg.ALLOW_FAKE_TTS_TO_GCS) {
    throw new Error(
      "TTS_DRIVER=fake with STORAGE_DRIVER=gcs would upload placeholder audio into the real bucket, where it is cached " +
        "for good. Set TTS_DRIVER=google, or STORAGE_DRIVER=local for offline work (ALLOW_FAKE_TTS_TO_GCS=true overrides).",
    );
  }
  if (cfg.ADMIN_TOKEN && cfg.ADMIN_TOKEN.length < 32) {
    throw new Error("ADMIN_TOKEN must be at least 32 characters (or unset to disable admin routes)");
  }

  cached = {
    ...cfg,
    isProd,
    customPronunciationLocales: cfg.TTS_CUSTOM_PRONUNCIATION_LOCALES.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
  return cached;
}

/** Test helper: forget the cached config so a test can mutate process.env. */
export function resetConfigForTests() {
  cached = null;
}
