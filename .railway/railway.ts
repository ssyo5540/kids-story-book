import { defineRailway, github, preserve, project, service } from "railway/iac";

/**
 * Railway infrastructure-as-code (replaces railway.json, which stops being read on 2026-12-01).
 *   railway login && railway link
 *   railway config plan && railway config apply
 * Secrets and environment-specific values are set once in the dashboard and preserved here.
 *
 * Note: the catalog pages render at request time, so CONTENT_INCLUDE_UNREVIEWED takes effect on the
 * next deploy without a code change. Keep it preserved: today every story is still `needs_review`,
 * and flipping it to "false" empties the catalog.
 */
export default defineRailway(() => {
  const web = service("kids-story-book", {
    source: github("ssyo5540/kids-story-book", { branch: "main" }),
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    replicas: 1,
    env: {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: preserve(),
      STORAGE_DRIVER: "gcs",
      TTS_DRIVER: "google",
      GCS_BUCKET: preserve(),
      PUBLIC_AUDIO_BASE_URL: preserve(),
      GCP_PROJECT_ID: preserve(),
      GCP_SA_KEY_JSON: preserve(),
      ADMIN_TOKEN: preserve(),
      TTS_MONTHLY_CHAR_BUDGET: "900000",
      TTS_DAILY_CHAR_BUDGET: "150000",
      TTS_LAZY_ENABLED: "true",
      TTS_ENABLED: "true",
      PUBLIC_GENERATION_PER_IP_PER_DAY: "3",
      PUBLIC_GENERATION_GLOBAL_PER_DAY: "20",
      CONTENT_INCLUDE_UNREVIEWED: preserve(),
      LOG_LEVEL: "info",
      NEXT_MANUAL_SIG_HANDLE: "true",
      RAILWAY_DEPLOYMENT_DRAINING_SECONDS: "60",
      RAILWAY_DEPLOYMENT_OVERLAP_SECONDS: "20",
    },
  });
  return project("supportive-flexibility", { resources: [web] });
});
