# Railway deployment

The app is one Docker service (Next.js standalone + ffmpeg). Hobby plan (~$5–6/month) is the only unavoidable cost.

## Files
- `Dockerfile` — multi-stage; build runs `content:validate` + `next build` with the fake TTS driver; runtime image
  has ffmpeg, runs as `node`, `tini` as PID 1.
- `railway.json` — build/deploy settings (health check `/api/health`, restart on failure, 60 s draining).
  Railway stops reading this file on 2026-12-01; `.railway/railway.ts` is the replacement (`railway config plan/apply`).
- `instrumentation.ts` — warms the runtime at boot and drains running audio jobs on SIGTERM.

## Variables (Settings → Variables)
| Name | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain` |
| `STORAGE_DRIVER` / `TTS_DRIVER` | `gcs` / `google` |
| `GCS_BUCKET`, `PUBLIC_AUDIO_BASE_URL`, `GCP_PROJECT_ID`, `GCP_SA_KEY_JSON` | from `docs/gcp-setup.md` |
| `ADMIN_TOKEN` | `openssl rand -hex 32` |
| `TTS_MONTHLY_CHAR_BUDGET` | `900000` (under the free tier) |
| `TTS_DAILY_CHAR_BUDGET` | `150000` |
| `TTS_LAZY_ENABLED` | `true` (set `false` to stop on-demand voices instantly) |
| `PUBLIC_GENERATION_PER_IP_PER_DAY` / `PUBLIC_GENERATION_GLOBAL_PER_DAY` | `3` / `20` |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | `60` |
| `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS` | `20` |

Optional build arg: `CONTENT_INCLUDE_UNREVIEWED=true` for a staging service that shows unreviewed translations.

## Steps
1. Push the repo to GitHub; in Railway create a project from the repo (Dockerfile is auto-detected).
2. Set the variables above; deploy; check `https://<domain>/api/health`.
3. Region: Singapore is closest to India; fall back to US West if your plan does not offer it.
4. Custom domain under Networking (CNAME + TXT, TLS automatic).
5. Leave App Sleeping off. One replica only (in-process job queue).

## Operations
- Logs: Observability → filter `@level:error`.
- `GET /api/admin/usage` (bearer token) — month-to-date characters, remaining budget, renditions, running jobs.
- `.github/workflows/uptime.yml` pings health every 30 min; `usage-report.yml` opens a monthly issue.
  Set repository variable `APP_URL` and secret `ADMIN_TOKEN`.
- Redeploys drain running jobs for up to 60 s; interrupted jobs are simply re-requested by the client.
